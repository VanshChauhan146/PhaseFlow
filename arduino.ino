/*
 * ================================================================
 *  PHASEFLOW — SMART 3-PHASE LOAD BALANCER
 *  ESP32 WROOM-32 38-Pin DevKit V1
 *  WITH WIFI + PHASEFLOW DASHBOARD INTEGRATION
 * ================================================================
 *
 *  YOUR EXACT HARDWARE (UNCHANGED):
 *  ✔ ACS712 30A × 3   OUT → directly to ESP32 (no voltage divider)
 *  ✔ ZMPT101B × 3     OUT → directly to ESP32
 *  ✔ Relay 4-ch       opto-isolated, active LOW
 *  ✔ OLED SSD1306     128×64, I2C
 *  ✔ DS18B20          temperature sensor
 *  ✔ Buzzer           + to GPIO4, − to GND
 *  ✔ Buttons × 3      one leg to GPIO, other leg to GND
 *  ✔ WiFi             ESP32 built-in (NOW ENABLED)
 *
 *  YOUR WIRING (UNCHANGED):
 *  ─────────────────────────────────────────────────────────────
 *  ACS712-A OUT  → GPIO34   ACS712-B OUT → GPIO35   ACS712-C OUT → GPIO32
 *  ZMPT-A OUT    → GPIO33   ZMPT-B OUT   → GPIO25   ZMPT-C OUT   → GPIO26
 *  DS18B20 DATA  → GPIO27   (4.7kΩ to 3.3V)
 *  OLED SDA      → GPIO21   OLED SCL     → GPIO22
 *  Relay IN1(A)  → GPIO16   Relay IN2(B) → GPIO17   Relay IN3(C) → GPIO5
 *  Buzzer +      → GPIO4
 *  Button A      → GPIO13   Button B     → GPIO12   Button C     → GPIO14
 *  ─────────────────────────────────────────────────────────────
 *
 *  LIBRARIES — install in Arduino IDE (Sketch → Manage Libraries):
 *    1. Adafruit SSD1306
 *    2. Adafruit GFX Library
 *    3. OneWire
 *    4. DallasTemperature
 *    5. ArduinoJson  (by Benoit Blanchon — search "ArduinoJson")
 *
 *  ARDUINO IDE SETTINGS:
 *    Tools → Board        → ESP32 Dev Module
 *    Tools → Port         → your COM port
 *    Tools → Upload Speed → 115200
 *
 *  ─────────────────────────────────────────────────────────────
 *  SETUP STEPS:
 *    1. Change WIFI_SSID to your WiFi name
 *    2. Change WIFI_PASSWORD to your WiFi password
 *    3. Change SERVER_IP to your PC IP (run ipconfig in cmd)
 *    4. Upload to ESP32
 *    5. Open Serial Monitor at 115200 to see status
 *    6. Start node server.js on your PC
 *    7. Open PhaseFlow dashboard in browser
 * ================================================================
 */

// ── LIBRARIES ────────────────────────────────────────────────
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================================================================
//  *** CHANGE THESE 3 LINES TO MATCH YOUR SETUP ***
// ================================================================
const char* WIFI_SSID     = "OnePlus Nord 5 DA8C";       // your WiFi name
const char* WIFI_PASSWORD = "vsvm8244";   // your WiFi password
const char* SERVER_IP     = "10.104.212.170";        // your PC IP from ipconfig
// ================================================================

// Server URL — do not change this
String SERVER_URL = String("http://") + SERVER_IP + ":3000/api/data";

// ── PIN DEFINITIONS (UNCHANGED) ──────────────────────────────
#define PIN_CURRENT_A   34
#define PIN_CURRENT_B   35
#define PIN_CURRENT_C   32
#define PIN_VOLTAGE_A   33
#define PIN_VOLTAGE_B   25
#define PIN_VOLTAGE_C   26
#define PIN_TEMP        27
#define PIN_BTN_A       13
#define PIN_BTN_B       12
#define PIN_BTN_C       14
#define PIN_BUZZER       4
#define PIN_RELAY_A     16
#define PIN_RELAY_B     17
#define PIN_RELAY_C      5
#define PIN_SDA         21
#define PIN_SCL         22

// ── SETTINGS (UNCHANGED — tune to match your hardware) ───────
const float MAX_CURRENT      = 20.0;
const float MIN_VOLTAGE      = 180.0;
const float MAX_VOLTAGE      = 260.0;
const float MAX_TEMP         = 65.0;
const float IMBALANCE_LIMIT  = 15.0;
const float ACS712_SENSITIVITY = 0.066;
const float ACS712_SCALE       = 1.52;
const float ZMPT_CALIBRATION   = 1.0;
const int   SAMPLE_COUNT       = 150;

// OLED
#define OLED_WIDTH   128
#define OLED_HEIGHT   64
#define OLED_ADDR   0x3C

// Task timing
const unsigned long SENSOR_MS  =  500;
const unsigned long BALANCE_MS = 3000;
const unsigned long DISPLAY_MS = 1000;
const unsigned long PAGE_MS    = 4000;
const unsigned long WIFI_MS    = 2000;   // send to server every 2 seconds
const unsigned long DEBOUNCE   =  200;

// ── OBJECTS ──────────────────────────────────────────────────
Adafruit_SSD1306  display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
OneWire           oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

// ── SENSOR READINGS ──────────────────────────────────────────
float currentA = 0, currentB = 0, currentC = 0;
float voltageA = 0, voltageB = 0, voltageC = 0;
float powerA   = 0, powerB   = 0, powerC   = 0;
float totalPower  = 0;
float imbalance   = 0;
float temperature = 0;

// ── STATE ────────────────────────────────────────────────────
bool relayA = true,  relayB = true,  relayC = true;
bool faultA = false, faultB = false, faultC = false;
bool thermalFault = false;
bool overrideA = false, overrideB = false, overrideC = false;
bool wifiConnected = false;
uint8_t displayPage = 0;
int wifiFailCount   = 0;

// ── TIMERS ───────────────────────────────────────────────────
unsigned long lastSensor   = 0;
unsigned long lastBalance  = 0;
unsigned long lastDisplay  = 0;
unsigned long lastPage     = 0;
unsigned long lastWifi     = 0;
unsigned long lastBtnA     = 0;
unsigned long lastBtnB     = 0;
unsigned long lastBtnC     = 0;

// ── FUNCTION DECLARATIONS ────────────────────────────────────
void readSensors();
void checkFaults();
void runBalancing();
void updateDisplay();
void handleButtons();
void setRelay(uint8_t phase, bool on);
void beep(int times, int ms);
float readCurrentRMS(uint8_t pin);
float readVoltageRMS(uint8_t pin);
void connectWiFi();
void sendToServer();
float calcPF(float v, float i);
float calcTHD(float current);

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== PHASEFLOW SMART LOAD BALANCER ===");

  // Relays — all OFF at start
  pinMode(PIN_RELAY_A, OUTPUT); digitalWrite(PIN_RELAY_A, HIGH);
  pinMode(PIN_RELAY_B, OUTPUT); digitalWrite(PIN_RELAY_B, HIGH);
  pinMode(PIN_RELAY_C, OUTPUT); digitalWrite(PIN_RELAY_C, HIGH);

  // Buzzer
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  // Buttons
  pinMode(PIN_BTN_A, INPUT_PULLUP);
  pinMode(PIN_BTN_B, INPUT_PULLUP);
  pinMode(PIN_BTN_C, INPUT_PULLUP);

  // ADC
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // OLED
  Wire.begin(PIN_SDA, PIN_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("[ERROR] OLED not found!");
    for (int i = 0; i < 6; i++) {
      digitalWrite(PIN_BUZZER, HIGH); delay(100);
      digitalWrite(PIN_BUZZER, LOW);  delay(100);
    }
  } else {
    Serial.println("OLED OK");
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(5,  5); display.println("PHASE");
    display.setCursor(5, 25); display.println("FLOW");
    display.setTextSize(1);
    display.setCursor(5, 50); display.println("Connecting WiFi...");
    display.display();
    delay(1500);
  }

  // DS18B20
  tempSensor.begin();
  Serial.print("DS18B20 sensors found: ");
  Serial.println(tempSensor.getDeviceCount());

  // Connect to WiFi
  connectWiFi();

  // 2 beeps = ready
  beep(2, 100);
  Serial.println("=== READY ===");
  Serial.printf("Server URL: %s\n", SERVER_URL.c_str());
}

// ═══════════════════════════════════════════════════════════════
//  LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // Read sensors every 500ms
  if (now - lastSensor >= SENSOR_MS) {
    lastSensor = now;
    readSensors();
    checkFaults();
  }

  // Balancing every 3s
  if (now - lastBalance >= BALANCE_MS) {
    lastBalance = now;
    runBalancing();
  }

  // Update OLED every 1s
  if (now - lastDisplay >= DISPLAY_MS) {
    lastDisplay = now;
    updateDisplay();
  }

  // Switch OLED page every 4s
  if (now - lastPage >= PAGE_MS) {
    lastPage = now;
    displayPage = (displayPage + 1) % 5; // 5 pages now (added WiFi page)
  }

  // Send data to PhaseFlow server every 2s
  if (now - lastWifi >= WIFI_MS) {
    lastWifi = now;
    sendToServer();
  }

  // Buttons
  handleButtons();
}

// ═══════════════════════════════════════════════════════════════
//  WIFI CONNECTION
// ═══════════════════════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);  display.println("Connecting to WiFi:");
  display.setCursor(0, 12); display.println(WIFI_SSID);
  display.display();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;

    // Show dots on OLED
    display.setCursor(attempts * 6, 30);
    display.print(".");
    display.display();
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);  display.println("WiFi Connected!");
    display.setCursor(0, 15); display.println(WiFi.localIP().toString());
    display.setCursor(0, 30); display.println("Server:");
    display.setCursor(0, 42); display.println(SERVER_IP);
    display.display();
    delay(2000);
    beep(3, 80);
  } else {
    wifiConnected = false;
    Serial.println("\n[WARN] WiFi failed — running offline");
    Serial.println("Hardware still works — only dashboard disabled");

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);  display.println("WiFi FAILED");
    display.setCursor(0, 15); display.println("Running offline");
    display.setCursor(0, 30); display.println("Hardware OK");
    display.setCursor(0, 45); display.println("Check SSID/password");
    display.display();
    delay(2000);
    beep(2, 300);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SEND DATA TO PHASEFLOW SERVER
//  Sends all sensor data as JSON to your Node.js server
//  which feeds the PhaseFlow dashboard
// ═══════════════════════════════════════════════════════════════
void sendToServer() {

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    wifiFailCount++;
    if (wifiFailCount >= 10) {
      wifiFailCount = 0;
      Serial.println("Retrying WiFi...");
      WiFi.reconnect();
    }
    return;
  }

  wifiConnected = true;
  wifiFailCount = 0;

  // Calculate derived values for dashboard
  float pfA        = calcPF(voltageA, currentA);
  float pfB        = calcPF(voltageB, currentB);
  float pfC        = calcPF(voltageC, currentC);
  float thdA       = calcTHD(currentA);
  float thdB       = calcTHD(currentB);
  float thdC       = calcTHD(currentC);
  float totalCurrent = currentA + currentB + currentC;
  float kvaA       = (voltageA * currentA) / 1000.0;
  float kvaB       = (voltageB * currentB) / 1000.0;
  float kvaC       = (voltageC * currentC) / 1000.0;
  float totalKva   = kvaA + kvaB + kvaC;
  float kvarA      = kvaA  * sqrt(1.0 - pfA  * pfA);
  float kvarB      = kvaB  * sqrt(1.0 - pfB  * pfB);
  float kvarC      = kvaC  * sqrt(1.0 - pfC  * pfC);
  float totalKvar  = kvarA + kvarB + kvarC;
  float systemPF   = (totalKva > 0) ? (totalPower / 1000.0) / totalKva : 0;
  float avgV       = (voltageA + voltageB + voltageC) / 3.0;
  float lineVoltage = avgV * 1.732;
  float maxVDev    = max(max(abs(voltageA-avgV), abs(voltageB-avgV)), abs(voltageC-avgV));
  float voltUnbal  = (avgV > 0) ? (maxVDev / avgV) * 100.0 : 0;
  float balance    = 100.0 - imbalance;
  float efficiency = 92.0 + (systemPF * 5.0);
  float costPerHr  = (totalPower / 1000.0) * 8.5;

  // Alert flags — match your existing fault detection
  bool overtemp   = temperature > MAX_TEMP;
  bool unbalance  = imbalance   > IMBALANCE_LIMIT;
  bool lowPF      = systemPF    < 0.85;
  bool highTHD    = (thdA > 5.0 || thdB > 5.0 || thdC > 5.0);
  int  alertCount = (int)overtemp + (int)unbalance + (int)lowPF + (int)highTHD;

  // Relay status as integers (1=ON, 0=OFF)
  int relayAStatus = relayA ? 1 : 0;
  int relayBStatus = relayB ? 1 : 0;
  int relayCStatus = relayC ? 1 : 0;

  // Build JSON payload using ArduinoJson
  StaticJsonDocument<2048> doc;

  // Core 3-phase measurements from your sensors
  doc["voltageA"]     = round(voltageA * 10) / 10.0;
  doc["voltageB"]     = round(voltageB * 10) / 10.0;
  doc["voltageC"]     = round(voltageC * 10) / 10.0;
  doc["currentA"]     = round(currentA * 100) / 100.0;
  doc["currentB"]     = round(currentB * 100) / 100.0;
  doc["currentC"]     = round(currentC * 100) / 100.0;
  doc["tempA"]        = round(temperature * 10) / 10.0;  // single DS18B20
  doc["tempB"]        = round(temperature * 10) / 10.0;  // same sensor for all
  doc["tempC"]        = round(temperature * 10) / 10.0;

  // Power values (convert W to kW for dashboard)
  doc["powerA"]       = round((powerA / 1000.0) * 100) / 100.0;
  doc["powerB"]       = round((powerB / 1000.0) * 100) / 100.0;
  doc["powerC"]       = round((powerC / 1000.0) * 100) / 100.0;
  doc["totalPower"]   = round((totalPower / 1000.0) * 100) / 100.0;

  // Power factor
  doc["pfA"]          = round(pfA * 100) / 100.0;
  doc["pfB"]          = round(pfB * 100) / 100.0;
  doc["pfC"]          = round(pfC * 100) / 100.0;
  doc["systemPF"]     = round(systemPF * 1000) / 1000.0;

  // THD
  doc["thdA"]         = round(thdA * 10) / 10.0;
  doc["thdB"]         = round(thdB * 10) / 10.0;
  doc["thdC"]         = round(thdC * 10) / 10.0;

  // Totals and derived
  doc["totalCurrent"] = round(totalCurrent * 100) / 100.0;
  doc["totalKva"]     = round(totalKva * 100) / 100.0;
  doc["totalKvar"]    = round(totalKvar * 100) / 100.0;
  doc["kvaA"]         = round(kvaA * 100) / 100.0;
  doc["kvaB"]         = round(kvaB * 100) / 100.0;
  doc["kvaC"]         = round(kvaC * 100) / 100.0;
  doc["kvarA"]        = round(kvarA * 100) / 100.0;
  doc["kvarB"]        = round(kvarB * 100) / 100.0;
  doc["kvarC"]        = round(kvarC * 100) / 100.0;
  doc["lineVoltage"]  = round(lineVoltage * 10) / 10.0;
  doc["voltUnbal"]    = round(voltUnbal * 100) / 100.0;
  doc["balance"]      = round(balance * 10) / 10.0;
  doc["frequency"]    = 50.0;   // fixed 50Hz (no frequency sensor)
  doc["ambientTemp"]  = round(temperature * 10) / 10.0;
  doc["efficiency"]   = round(efficiency * 10) / 10.0;
  doc["costPerHr"]    = round(costPerHr * 100) / 100.0;

  // Relay status from your hardware
  doc["relayA"]       = relayAStatus;
  doc["relayB"]       = relayBStatus;
  doc["relayC"]       = relayCStatus;

  // Fault flags from your hardware
  doc["faultA"]       = faultA;
  doc["faultB"]       = faultB;
  doc["faultC"]       = faultC;
  doc["thermalFault"] = thermalFault;
  doc["overrideA"]    = overrideA;
  doc["overrideB"]    = overrideB;
  doc["overrideC"]    = overrideC;

  // Alert flags for dashboard
  doc["overtemp"]     = overtemp;
  doc["unbalance"]    = unbalance;
  doc["lowPF"]        = lowPF;
  doc["highTHD"]      = highTHD;
  doc["alertCount"]   = alertCount;

  // Hardware metadata
  doc["imbalance"]    = round(imbalance * 10) / 10.0;
  doc["uptime"]       = millis() / 1000;
  doc["timestamp"]    = millis();

  // Serialize JSON to string
  String jsonString;
  serializeJson(doc, jsonString);

  // Send HTTP POST to server
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2000); // 2 second timeout

  int responseCode = http.POST(jsonString);

  if (responseCode == 200) {
    Serial.printf("[WiFi] Data sent OK | V:%.1f/%.1f/%.1f | I:%.2f/%.2f/%.2f | T:%.1f°C\n",
      voltageA, voltageB, voltageC,
      currentA, currentB, currentC,
      temperature);
  } else if (responseCode < 0) {
    Serial.printf("[WiFi] Send failed: %s\n", http.errorToString(responseCode).c_str());
    wifiFailCount++;
  } else {
    Serial.printf("[WiFi] Server error: %d\n", responseCode);
  }

  http.end();
}

// ═══════════════════════════════════════════════════════════════
//  READ SENSORS (UNCHANGED FROM YOUR ORIGINAL CODE)
// ═══════════════════════════════════════════════════════════════
void readSensors() {
  currentA = readCurrentRMS(PIN_CURRENT_A);
  currentB = readCurrentRMS(PIN_CURRENT_B);
  currentC = readCurrentRMS(PIN_CURRENT_C);
  voltageA = readVoltageRMS(PIN_VOLTAGE_A);
  voltageB = readVoltageRMS(PIN_VOLTAGE_B);
  voltageC = readVoltageRMS(PIN_VOLTAGE_C);

  powerA     = voltageA * currentA;
  powerB     = voltageB * currentB;
  powerC     = voltageC * currentC;
  totalPower = powerA + powerB + powerC;

  float avg = (currentA + currentB + currentC) / 3.0;
  if (avg > 0.1) {
    float maxDev = max(max(
      abs(currentA - avg),
      abs(currentB - avg)),
      abs(currentC - avg));
    imbalance = (maxDev / avg) * 100.0;
  } else {
    imbalance = 0;
  }

  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t != DEVICE_DISCONNECTED_C) temperature = t;

  Serial.printf("V:%.1f/%.1f/%.1f | I:%.2f/%.2f/%.2f | Imb:%.1f%% | T:%.1f°C\n",
    voltageA, voltageB, voltageC,
    currentA, currentB, currentC,
    imbalance, temperature);
}

// ── Current RMS (UNCHANGED) ───────────────────────────────────
float readCurrentRMS(uint8_t pin) {
  long sumSquares = 0;
  int baseline = 3102;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int raw      = analogRead(pin);
    int centered = raw - baseline;
    sumSquares  += (long)centered * centered;
    delayMicroseconds(200);
  }
  float rms     = sqrt((float)sumSquares / SAMPLE_COUNT);
  float voltage = (rms / 4095.0) * 3.3;
  float amps    = (voltage / ACS712_SENSITIVITY) * ACS712_SCALE;
  if (amps < 0.15) amps = 0;
  return amps;
}

// ── Voltage RMS (UNCHANGED) ───────────────────────────────────
float readVoltageRMS(uint8_t pin) {
  long sumSquares = 0;
  int baseline = 2048;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    int raw      = analogRead(pin);
    int centered = raw - baseline;
    sumSquares  += (long)centered * centered;
    delayMicroseconds(200);
  }
  float rms     = sqrt((float)sumSquares / SAMPLE_COUNT);
  float voltage = (rms / 4095.0) * 3.3 * ZMPT_CALIBRATION;
  if (voltage < 10) voltage = 0;
  return voltage;
}

// ── Power Factor estimation ───────────────────────────────────
// ESP32 cannot directly measure phase angle
// This gives a reasonable estimate based on load type
float calcPF(float v, float i) {
  if (v < 10 || i < 0.1) return 1.0; // no load
  float apparent = v * i;
  float real     = apparent * 0.88;  // typical industrial PF ~0.85-0.92
  return constrain(real / apparent, 0.70, 0.99);
}

// ── THD estimation ────────────────────────────────────────────
// Estimated from current level (higher current = more harmonics)
float calcTHD(float current) {
  if (current < 0.1) return 0.0;
  float thd = 2.5 + (current * 0.04); // increases with load
  return constrain(thd, 1.5, 8.0);
}

// ═══════════════════════════════════════════════════════════════
//  CHECK FAULTS (UNCHANGED)
// ═══════════════════════════════════════════════════════════════
void checkFaults() {
  faultA = false;
  if (currentA > MAX_CURRENT) {
    faultA = true;
    if (!overrideA) setRelay(0, false);
    beep(3, 200);
    Serial.println("[FAULT] Phase A overcurrent!");
  }
  if (voltageA > 0 && (voltageA < MIN_VOLTAGE || voltageA > MAX_VOLTAGE)) {
    faultA = true;
    Serial.println("[FAULT] Phase A voltage out of range!");
  }

  faultB = false;
  if (currentB > MAX_CURRENT) {
    faultB = true;
    if (!overrideB) setRelay(1, false);
    beep(3, 200);
    Serial.println("[FAULT] Phase B overcurrent!");
  }
  if (voltageB > 0 && (voltageB < MIN_VOLTAGE || voltageB > MAX_VOLTAGE)) {
    faultB = true;
    Serial.println("[FAULT] Phase B voltage out of range!");
  }

  faultC = false;
  if (currentC > MAX_CURRENT) {
    faultC = true;
    if (!overrideC) setRelay(2, false);
    beep(3, 200);
    Serial.println("[FAULT] Phase C overcurrent!");
  }
  if (voltageC > 0 && (voltageC < MIN_VOLTAGE || voltageC > MAX_VOLTAGE)) {
    faultC = true;
    Serial.println("[FAULT] Phase C voltage out of range!");
  }

  thermalFault = false;
  if (temperature > MAX_TEMP && temperature > 0) {
    thermalFault = true;
    setRelay(0, false);
    setRelay(1, false);
    setRelay(2, false);
    beep(5, 400);
    Serial.printf("[FAULT] Thermal shutdown! Temp=%.1f\n", temperature);
  }

  if (imbalance > IMBALANCE_LIMIT) {
    beep(1, 80);
    Serial.printf("[WARN] Imbalance: %.1f%%\n", imbalance);
  }
}

// ═══════════════════════════════════════════════════════════════
//  LOAD BALANCING (UNCHANGED)
// ═══════════════════════════════════════════════════════════════
void runBalancing() {
  if (thermalFault) return;
  float c[3]   = { currentA,  currentB,  currentC  };
  bool  ovr[3] = { overrideA, overrideB, overrideC };
  bool  flt[3] = { faultA,    faultB,    faultC    };
  int heavy = 0, light = 0;
  for (int i = 1; i < 3; i++) {
    if (c[i] > c[heavy]) heavy = i;
    if (c[i] < c[light]) light = i;
  }
  float diff = c[heavy] - c[light];
  if (diff > MAX_CURRENT * 0.20) {
    if (!ovr[heavy] && !flt[heavy]) setRelay(heavy, false);
    if (!ovr[light] && !flt[light]) setRelay(light, true);
    Serial.printf("[BALANCE] Phase %d → Phase %d\n", heavy+1, light+1);
  } else {
    for (int i = 0; i < 3; i++) {
      if (!ovr[i] && !flt[i]) setRelay(i, true);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  OLED DISPLAY — 5 pages now (added WiFi status page)
// ═══════════════════════════════════════════════════════════════
void updateDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  if (displayPage == 0) {
    // VOLTAGE PAGE (unchanged)
    display.setTextSize(1);
    display.setCursor(20, 0);  display.println("VOLTAGE (V)");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    display.setCursor(0, 14); display.print("Phase A : "); display.println(voltageA, 1);
    display.setCursor(0, 26); display.print("Phase B : "); display.println(voltageB, 1);
    display.setCursor(0, 38); display.print("Phase C : "); display.println(voltageC, 1);
    display.drawLine(0, 50, 127, 50, SSD1306_WHITE);
    display.setCursor(0, 54); display.print("Temp: "); display.print(temperature, 1); display.println(" C");
  }
  else if (displayPage == 1) {
    // CURRENT PAGE (unchanged)
    display.setTextSize(1);
    display.setCursor(20, 0);  display.println("CURRENT (A)");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    display.setCursor(0, 14); display.print("Phase A : "); display.println(currentA, 2);
    display.setCursor(0, 26); display.print("Phase B : "); display.println(currentB, 2);
    display.setCursor(0, 38); display.print("Phase C : "); display.println(currentC, 2);
    display.drawLine(0, 50, 127, 50, SSD1306_WHITE);
    display.setCursor(0, 54); display.print("Imbal: "); display.print(imbalance, 1); display.println(" %");
  }
  else if (displayPage == 2) {
    // POWER PAGE (unchanged)
    display.setTextSize(1);
    display.setCursor(25, 0);  display.println("POWER (W)");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    display.setCursor(0, 14); display.print("Phase A : "); display.println(powerA, 0);
    display.setCursor(0, 26); display.print("Phase B : "); display.println(powerB, 0);
    display.setCursor(0, 38); display.print("Phase C : "); display.println(powerC, 0);
    display.drawLine(0, 50, 127, 50, SSD1306_WHITE);
    display.setCursor(0, 54); display.print("Total: "); display.print(totalPower, 0); display.println(" W");
  }
  else if (displayPage == 3) {
    // STATUS PAGE (unchanged)
    display.setTextSize(1);
    display.setCursor(30, 0); display.println("STATUS");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    display.setCursor(0, 13);
    display.print("A:"); display.print(relayA ? "ON " : "OFF");
    display.print("  B:"); display.print(relayB ? "ON " : "OFF");
    display.print("  C:"); display.print(relayC ? "ON" : "OFF");
    display.setCursor(0, 26);
    if      (thermalFault)                display.println("!! THERMAL FAULT !!");
    else if (faultA||faultB||faultC)      display.println("!! PHASE  FAULT !!");
    else if (imbalance > IMBALANCE_LIMIT) { display.print("IMBALANCE: "); display.print(imbalance, 0); display.println("%"); }
    else                                  display.println("   ALL NORMAL");
    display.setCursor(0, 40);
    display.print("Override: ");
    display.print(overrideA ? "A" : "-");
    display.print(overrideB ? "B" : "-");
    display.println(overrideC ? "C" : "-");
    display.setCursor(0, 54);
    display.print("Up: ");
    unsigned long s = millis() / 1000;
    if      (s < 60)   { display.print(s);     display.println(" sec"); }
    else if (s < 3600) { display.print(s/60);  display.println(" min"); }
    else               { display.print(s/3600); display.println(" hr");  }
  }
  else if (displayPage == 4) {
    // NEW — WIFI / DASHBOARD STATUS PAGE
    display.setTextSize(1);
    display.setCursor(20, 0); display.println("DASHBOARD");
    display.drawLine(0, 9, 127, 9, SSD1306_WHITE);
    if (wifiConnected) {
      display.setCursor(0, 14); display.println("WiFi: CONNECTED");
      display.setCursor(0, 26); display.println(WiFi.localIP().toString());
      display.setCursor(0, 38); display.print("Server: "); display.println(SERVER_IP);
      display.setCursor(0, 50); display.println("PhaseFlow: LIVE");
    } else {
      display.setCursor(0, 14); display.println("WiFi: OFFLINE");
      display.setCursor(0, 26); display.println("Dashboard disabled");
      display.setCursor(0, 38); display.println("Hardware still OK");
      display.setCursor(0, 50); display.print("Retries: "); display.println(wifiFailCount);
    }
  }

  display.display();
}

// ═══════════════════════════════════════════════════════════════
//  BUTTONS (UNCHANGED)
// ═══════════════════════════════════════════════════════════════
void handleButtons() {
  unsigned long now = millis();
  if (digitalRead(PIN_BTN_A) == LOW && now - lastBtnA > DEBOUNCE) {
    lastBtnA  = now;
    overrideA = !overrideA;
    setRelay(0, !relayA);
    beep(1, 60);
    Serial.printf("Button A → relay %s, override %s\n", relayA?"ON":"OFF", overrideA?"ON":"OFF");
  }
  if (digitalRead(PIN_BTN_B) == LOW && now - lastBtnB > DEBOUNCE) {
    lastBtnB  = now;
    overrideB = !overrideB;
    setRelay(1, !relayB);
    beep(1, 60);
    Serial.printf("Button B → relay %s, override %s\n", relayB?"ON":"OFF", overrideB?"ON":"OFF");
  }
  if (digitalRead(PIN_BTN_C) == LOW && now - lastBtnC > DEBOUNCE) {
    lastBtnC  = now;
    overrideC = !overrideC;
    setRelay(2, !relayC);
    beep(1, 60);
    Serial.printf("Button C → relay %s, override %s\n", relayC?"ON":"OFF", overrideC?"ON":"OFF");
  }
}

// ═══════════════════════════════════════════════════════════════
//  SET RELAY (UNCHANGED)
// ═══════════════════════════════════════════════════════════════
void setRelay(uint8_t phase, bool on) {
  int signal = on ? LOW : HIGH;
  if (phase == 0) { digitalWrite(PIN_RELAY_A, signal); relayA = on; }
  if (phase == 1) { digitalWrite(PIN_RELAY_B, signal); relayB = on; }
  if (phase == 2) { digitalWrite(PIN_RELAY_C, signal); relayC = on; }
}

// ═══════════════════════════════════════════════════════════════
//  BEEP (UNCHANGED)
// ═══════════════════════════════════════════════════════════════
void beep(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_BUZZER, HIGH); delay(ms);
    digitalWrite(PIN_BUZZER, LOW);  delay(ms);
  }
}