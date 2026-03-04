#!/usr/bin/env node

import { homedir, tmpdir } from "os";
import { join } from "path";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import { execSync } from "child_process";

const SNAP_DIR = join(homedir(), ".snap");
const LATEST_PATH = join(SNAP_DIR, "latest.png");
const COUNTDOWN_SECONDS = 3;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runPs(script) {
  const ps1 = join(tmpdir(), `snap-${Date.now()}.ps1`);
  writeFileSync(ps1, script);
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${ps1}"`, { windowsHide: true });
  } finally {
    try { unlinkSync(ps1); } catch {}
  }
}

function playSound(wavFile) {
  runPs(`(New-Object System.Media.SoundPlayer("$env:SystemRoot\\Media\\${wavFile}")).PlaySync()`);
}

function captureToFile(outputPath) {
  runPs(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bmp.Save('${outputPath}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
`.trim());
}

function copyFileToClipboard(imagePath) {
  runPs(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${imagePath}')
[System.Windows.Forms.Clipboard]::SetDataObject($img, $true)
`.trim());
}

async function run() {
  // Countdown with a single ding to signal start
  process.stdout.write(`⏳ Grabbing in ${COUNTDOWN_SECONDS}s... alt-tab now`);
  playSound("ding.wav");

  for (let i = COUNTDOWN_SECONDS - 1; i >= 1; i--) {
    await sleep(900);
    process.stdout.write(` ${i}`);
    playSound("ding.wav");
  }
  await sleep(900);
  process.stdout.write("\n");

  // Capture
  mkdirSync(SNAP_DIR, { recursive: true });
  try { unlinkSync(LATEST_PATH); } catch {}

  try {
    captureToFile(LATEST_PATH);
  } catch (err) {
    console.error("Error: Failed to capture screenshot.", err.message);
    process.exit(1);
  }

  // Chimes = captured
  playSound("chimes.wav");

  // Copy to clipboard
  try {
    copyFileToClipboard(LATEST_PATH);
  } catch (err) {
    console.error("Error: Failed to copy to clipboard.", err.message);
    process.exit(1);
  }

  console.log("📸 Screenshot on clipboard — Ctrl+V to paste");
}

run();
