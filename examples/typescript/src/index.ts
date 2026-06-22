const baudrates = document.getElementById("baudrates") as HTMLSelectElement;
const consoleBaudrates = document.getElementById("consoleBaudrates") as HTMLSelectElement;
const reconnectDelay = document.getElementById("reconnectDelay") as HTMLInputElement;
const maxRetriesInput = document.getElementById("maxRetries") as HTMLInputElement;
const connectButton = document.getElementById("connectButton") as HTMLButtonElement;
const traceButton = document.getElementById("copyTraceButton") as HTMLButtonElement;
const disconnectButton = document.getElementById("disconnectButton") as HTMLButtonElement;
const resetButton = document.getElementById("resetButton") as HTMLButtonElement;
const consoleStartButton = document.getElementById("consoleStartButton") as HTMLButtonElement;
const consoleStopButton = document.getElementById("consoleStopButton") as HTMLButtonElement;
const eraseButton = document.getElementById("eraseButton") as HTMLButtonElement;
const addFileButton = document.getElementById("addFile") as HTMLButtonElement;
const programButton = document.getElementById("programButton") as HTMLButtonElement;
const filesDiv = document.getElementById("files");
const terminal = document.getElementById("terminal");
const programDiv = document.getElementById("program");
const consoleDiv = document.getElementById("console");
const lblBaudrate = document.getElementById("lblBaudrate");
const lblConsoleBaudrate = document.getElementById("lblConsoleBaudrate");
const lblConsoleFor = document.getElementById("lblConsoleFor");
const lblConnTo = document.getElementById("lblConnTo");
const connDeviceText = document.getElementById("connDeviceText");
const table = document.getElementById("fileTable") as HTMLTableElement;
const alertDiv = document.getElementById("alertDiv");
const flashMode = document.getElementById("flashMode") as HTMLSelectElement;
const flashFreq = document.getElementById("flashFreq") as HTMLSelectElement;
const flashSize = document.getElementById("flashSize") as HTMLSelectElement;
const lblFlashMode = document.getElementById("lblFlashMode");
const lblFlashFreq = document.getElementById("lblFlashFreq");
const lblFlashSize = document.getElementById("lblFlashSize");

const debugLogging = document.getElementById("debugLogging") as HTMLInputElement;

import {
  ESPLoader,
  FlashOptions,
  FlashModeValues,
  FlashFreqValues,
  FlashSizeValues,
  LoaderOptions,
  Transport,
} from "../../../lib";
import { serial } from "web-serial-polyfill";

const serialLib = !navigator.serial && navigator.usb ? serial : navigator.serial;

declare let Terminal;
declare let CryptoJS;

const term = new Terminal({ cols: 120, rows: 40 });
term.open(terminal);

let device = null;
let deviceInfo = null;
let transport: Transport;
let chip: string = null;
let esploader: ESPLoader;

const show = (el: HTMLElement) => el.classList.remove("hidden");
const hide = (el: HTMLElement) => el.classList.add("hidden");

hide(traceButton);
hide(eraseButton);
hide(consoleStopButton);
hide(resetButton);
hide(filesDiv);
hide(flashMode);
hide(flashFreq);
hide(flashSize);
hide(lblFlashMode);
hide(lblFlashFreq);
hide(lblFlashSize);

function handleFileSelect(evt) {
  const file = evt.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = (ev: ProgressEvent<FileReader>) => {
    if (ev.target.result instanceof ArrayBuffer) {
      evt.target.data = new Uint8Array(ev.target.result);
    } else {
      evt.target.data = ev.target.result;
    }
  };

  reader.readAsArrayBuffer(file);
}

const espLoaderTerminal = {
  clean() {
    term.clear();
  },
  writeLine(data) {
    term.writeln(data);
  },
  write(data) {
    term.write(data);
  },
};

function populateFlashDropdowns() {
  if (!esploader || !esploader.chip) {
    return;
  }

  flashFreq.innerHTML = '<option value="keep">keep</option>';
  const flashFreqKeys = Object.keys(esploader.chip.FLASH_FREQUENCY).sort((a, b) => {
    const freqOrder = ["80m", "60m", "48m", "40m", "30m", "26m", "24m", "20m", "16m", "15m", "12m"];
    const indexA = freqOrder.indexOf(a);
    const indexB = freqOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
  flashFreqKeys.forEach((freq) => {
    const option = document.createElement("option");
    option.value = freq;
    option.textContent = freq;
    flashFreq.appendChild(option);
  });
  flashFreq.options[0].selected = true;

  flashSize.innerHTML = '<option value="detect">detect</option><option value="keep">keep</option>';
  const flashSizeKeys = Object.keys(esploader.chip.FLASH_SIZES).sort((a, b) => {
    const sizeOrder = [
      "256KB",
      "512KB",
      "1MB",
      "2MB",
      "2MB-c1",
      "4MB",
      "4MB-c1",
      "8MB",
      "16MB",
      "32MB",
      "64MB",
      "128MB",
    ];
    const indexA = sizeOrder.indexOf(a);
    const indexB = sizeOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
  flashSizeKeys.forEach((size) => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    flashSize.appendChild(option);
  });
  flashSize.options[1].selected = true;
}

connectButton.onclick = async () => {
  try {
    if (device === null) {
      device = await serialLib.requestPort({});
      deviceInfo = device.getInfo();
      transport = new Transport(device, true);
    }
    const flashOptions = {
      transport,
      baudrate: parseInt(baudrates.value),
      terminal: espLoaderTerminal,
      debugLogging: debugLogging.checked,
    } as LoaderOptions;
    esploader = new ESPLoader(flashOptions);

    show(traceButton);
    chip = await esploader.main();

    populateFlashDropdowns();

    console.log("Settings done for :" + chip);
    hide(lblBaudrate);
    hide(baudrates);
    hide(connectButton);
    connDeviceText.textContent = "Connected to: " + chip;
    show(lblConnTo);
    show(disconnectButton);
    show(eraseButton);
    show(filesDiv);
    show(flashMode);
    show(flashFreq);
    show(flashSize);
    show(lblFlashMode);
    show(lblFlashFreq);
    show(lblFlashSize);
    hide(consoleDiv);
  } catch (e) {
    console.error(e);
    term.writeln(`Error: ${e.message}`);
  }
};

traceButton.onclick = async () => {
  if (transport) {
    transport.returnTrace();
  }
};

resetButton.onclick = async () => {
  if (transport) {
    await transport.setDTR(false);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await transport.setDTR(true);
  }
};

eraseButton.onclick = async () => {
  eraseButton.disabled = true;
  try {
    await esploader.eraseFlash();
  } catch (e) {
    console.error(e);
    term.writeln(`Error: ${e.message}`);
  } finally {
    eraseButton.disabled = false;
  }
};

addFileButton.onclick = () => {
  const rowCount = table.rows.length;
  const row = table.insertRow(rowCount);

  const cell1 = row.insertCell(0);
  const element1 = document.createElement("input");
  element1.type = "text";
  element1.id = "offset" + rowCount;
  element1.value = "0x1000";
  cell1.appendChild(element1);

  const cell2 = row.insertCell(1);
  const element2 = document.createElement("input");
  element2.type = "file";
  element2.id = "selectFile" + rowCount;
  element2.name = "selected_File" + rowCount;
  element2.addEventListener("change", handleFileSelect, false);
  cell2.appendChild(element2);

  const cell3 = row.insertCell(2);
  cell3.classList.add("progress-cell");
  hide(cell3);
  cell3.innerHTML = `<progress value="0" max="100"></progress>`;

  const cell4 = row.insertCell(3);
  cell4.classList.add("action-cell");
  if (rowCount > 1) {
    const element4 = document.createElement("button");
    element4.className = "btn btn-outline";
    element4.textContent = "Remove";
    element4.onclick = function () {
      removeRow(row);
    };
    cell4.appendChild(element4);
  }
};

function removeRow(row: HTMLTableRowElement) {
  const rowIndex = Array.from(table.rows).indexOf(row);
  table.deleteRow(rowIndex);
}

function cleanUp() {
  device = null;
  deviceInfo = null;
  transport = null;
  chip = null;
}

disconnectButton.onclick = async () => {
  if (transport) await transport.disconnect();

  term.reset();
  show(lblBaudrate);
  show(baudrates);
  show(consoleBaudrates);
  show(connectButton);
  hide(disconnectButton);
  hide(traceButton);
  hide(eraseButton);
  hide(lblConnTo);
  hide(filesDiv);
  hide(flashMode);
  hide(flashFreq);
  hide(flashSize);
  hide(lblFlashMode);
  hide(lblFlashFreq);
  hide(lblFlashSize);
  hide(alertDiv);
  show(consoleDiv);
  cleanUp();
};

let isConsoleClosed = false;
let isReconnecting = false;

const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

consoleStartButton.onclick = async () => {
  if (device === null) {
    device = await serialLib.requestPort({});
    transport = new Transport(device, true);
    deviceInfo = device.getInfo();

    transport.setDeviceLostCallback(async () => {
      if (!isConsoleClosed && !isReconnecting) {
        term.writeln("\n[DEVICE LOST] Device disconnected. Trying to reconnect...");
        await sleep(parseInt(reconnectDelay.value));
        isReconnecting = true;

        const maxRetries = parseInt(maxRetriesInput.value);
        let retryCount = 0;

        while (retryCount < maxRetries && !isConsoleClosed) {
          retryCount++;
          term.writeln(`\n[RECONNECT] Attempt ${retryCount}/${maxRetries}...`);

          if (serialLib && serialLib.getPorts) {
            const ports = await serialLib.getPorts();
            if (ports.length > 0) {
              const newDevice = ports.find(
                (port) =>
                  port.getInfo().usbVendorId === deviceInfo.usbVendorId &&
                  port.getInfo().usbProductId === deviceInfo.usbProductId,
              );

              if (newDevice) {
                device = newDevice;
                transport.updateDevice(device);
                term.writeln("[RECONNECT] Found previously authorized device, connecting...");
                await transport.connect(parseInt(consoleBaudrates.value));
                term.writeln("[RECONNECT] Successfully reconnected!");
                show(consoleStopButton);
                show(resetButton);
                isReconnecting = false;

                startConsoleReading();
                return;
              }
            }
          }

          if (retryCount < maxRetries) {
            term.writeln(`[RECONNECT] Device not found, retrying in ${parseInt(reconnectDelay.value)}ms...`);
            await sleep(parseInt(reconnectDelay.value));
          }
        }

        if (retryCount >= maxRetries) {
          term.writeln("\n[RECONNECT] Failed to reconnect after 5 attempts. Please manually reconnect.");
          isReconnecting = false;
        }
      }
    });
  }

  show(lblConsoleFor);
  hide(lblConsoleBaudrate);
  hide(consoleBaudrates);
  hide(consoleStartButton);
  show(consoleStopButton);
  show(resetButton);
  hide(programDiv);

  await transport.connect(parseInt(consoleBaudrates.value));
  isConsoleClosed = false;
  isReconnecting = false;

  startConsoleReading();
};

const IDF_LOG_LEVEL_REGEX = /^(I|W|E) \([\d.: -]+\)/;
const ANSI = {
  RED: "\x1b[1;31m",
  GREEN: "\x1b[0;32m",
  YELLOW: "\x1b[0;33m",
  NORMAL: "\x1b[0m",
};

function colorizeIdfLine(line: string): string {
  const match = IDF_LOG_LEVEL_REGEX.exec(line);
  if (!match) return line;
  const color = match[1] === "E" ? ANSI.RED : match[1] === "W" ? ANSI.YELLOW : ANSI.GREEN;
  return color + line + ANSI.NORMAL;
}

async function startConsoleReading() {
  if (isConsoleClosed || !transport) return;

  const decoder = new TextDecoder("utf-8");
  let lineBuffer = "";
  try {
    await transport.rawRead(
      (value) => {
        lineBuffer += decoder.decode(value);
        let idx: number;
        while ((idx = lineBuffer.indexOf("\n")) !== -1) {
          const lineWithEol = lineBuffer.slice(0, idx + 1);
          lineBuffer = lineBuffer.slice(idx + 1);
          const lineStripped = lineWithEol.replace(/\r?\n$/, "");
          const eol = lineWithEol.slice(lineStripped.length);
          term.write(colorizeIdfLine(lineStripped) + eol);
        }
      },
      () => isConsoleClosed,
    );
    if (lineBuffer.length > 0) {
      term.write(colorizeIdfLine(lineBuffer));
    }
  } catch (error) {
    if (!isConsoleClosed) {
      term.writeln(`\n[CONSOLE ERROR] ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!isConsoleClosed) {
    term.writeln("\n[CONSOLE] Connection lost, waiting for reconnection...");
  }
}

consoleStopButton.onclick = async () => {
  isConsoleClosed = true;
  isReconnecting = false;
  if (transport) {
    await transport.disconnect();
    await transport.waitForUnlock(1500);
  }
  term.reset();
  show(lblConsoleBaudrate);
  show(consoleBaudrates);
  show(consoleStartButton);
  hide(consoleStopButton);
  hide(resetButton);
  hide(lblConsoleFor);
  show(programDiv);
  cleanUp();
};

function validateProgramInputs() {
  const offsetArr = [];
  const rowCount = table.rows.length;
  let row;
  let offset = 0;
  let fileData = null;

  for (let index = 1; index < rowCount; index++) {
    row = table.rows[index];

    const offSetObj = row.cells[0].childNodes[0] as HTMLInputElement;
    offset = parseInt(offSetObj.value);

    if (Number.isNaN(offset)) return "Offset field in row " + index + " is not a valid address!";
    else if (offsetArr.includes(offset)) return "Offset field in row " + index + " is already in use!";
    else offsetArr.push(offset);

    const fileObj = row.cells[1].childNodes[0] as HTMLInputElement & { data: Uint8Array };
    fileData = fileObj.data;
    if (fileData == null) return "No file selected for row " + index + "!";
  }
  return "success";
}

programButton.onclick = async () => {
  const alertMsg = document.getElementById("alertmsg");
  const err = validateProgramInputs();

  if (err != "success") {
    alertMsg.innerHTML = "<strong>" + err + "</strong>";
    show(alertDiv);
    return;
  }

  hide(alertDiv);

  const fileArray = [];
  const progressBars = [];

  for (let index = 1; index < table.rows.length; index++) {
    const row = table.rows[index];

    const offSetObj = row.cells[0].childNodes[0] as HTMLInputElement;
    const offset = parseInt(offSetObj.value);

    const fileObj = row.cells[1].childNodes[0] as ChildNode & { data: Uint8Array };
    const progressBar = row.cells[2].childNodes[0] as HTMLProgressElement;

    progressBar.value = 0;
    progressBars.push(progressBar);

    show(row.cells[2] as HTMLElement);
    hide(row.cells[3] as HTMLElement);

    fileArray.push({ data: fileObj.data, address: offset });
  }

  try {
    const flashOptions: FlashOptions = {
      fileArray: fileArray,
      eraseAll: false,
      compress: true,
      flashMode: flashMode.value as FlashModeValues,
      flashFreq: flashFreq.value as FlashFreqValues,
      flashSize: flashSize.value as FlashSizeValues,
      reportProgress: (fileIndex, written, total) => {
        progressBars[fileIndex].value = (written / total) * 100;
      },
      calculateMD5Hash: (image: Uint8Array) => {
        const latin1String = Array.from(image, (byte) => String.fromCharCode(byte)).join("");
        return CryptoJS.MD5(CryptoJS.enc.Latin1.parse(latin1String)).toString();
      },
    };
    await esploader.writeFlash(flashOptions);
    await esploader.after();
  } catch (e) {
    console.error(e);
    term.writeln(`Error: ${e.message}`);
  } finally {
    for (let index = 1; index < table.rows.length; index++) {
      hide(table.rows[index].cells[2] as HTMLElement);
      show(table.rows[index].cells[3] as HTMLElement);
    }
  }
};

addFileButton.onclick(new MouseEvent("click"));
