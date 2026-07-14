/**
 * FocusBuddy Matrix — ESP32-S3 像素宠物固件
 * 
 * 硬件: Waveshare ESP32-S3-Matrix (8x8 NEO_RGB)
 * I2C: SDA=GPIO11, SCL=GPIO12
 * 
 * WiFi AP: FocusBuddy / 12345678 → 10.10.10.1
 * API:
 *   GET /pet?state=happy|worried|angry|sleep|celebrate
 *   GET /alert
 *   GET /status
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_NeoPixel.h>

// ===== 硬件配置 =====
#define LED_PIN     39         // ESP32-S3-Matrix NeoPixel 引脚
#define LED_COUNT   64         // 8x8
#define LED_TYPE    NEO_RGB + NEO_KHZ800

// ===== WiFi AP =====
const char* AP_SSID = "FocusBuddy";
const char* AP_PASS = "12345678";
IPAddress apIP(10, 10, 10, 1);
IPAddress apGateway(10, 10, 10, 1);
IPAddress apSubnet(255, 255, 255, 0);

// ===== 服务器 =====
WebServer server(80);
Adafruit_NeoPixel strip(LED_COUNT, LED_PIN, LED_TYPE);

// ===== 宠物状态 =====
String petState = "sleep";   // happy, worried, angry, sleep, celebrate
bool alertActive = false;
unsigned long alertStart = 0;
int alertPhase = 0;
String currentState = "sleep";
unsigned long lastFrame = 0;
int animFrame = 0;

// ===== 8x8 像素表情 =====
// 每个字节的 bit 位对应 LED 开关（1=亮, 0=灭）
// 按行存储，每行8位

const uint8_t FACE_HAPPY[8] = {
  0b00000000,
  0b01100110,
  0b01100110,
  0b00000000,
  0b00011000,
  0b10000001,
  0b01111110,
  0b00000000
};

const uint8_t FACE_WORRIED[8] = {
  0b00000000,
  0b01100110,
  0b01100110,
  0b00011000,
  0b00000000,
  0b01111110,
  0b10000001,
  0b00000000
};

const uint8_t FACE_ANGRY[8] = {
  0b01100110,
  0b01100110,
  0b00000000,
  0b01111110,
  0b10000001,
  0b10000001,
  0b10000001,
  0b01111110
};

const uint8_t FACE_SLEEP[8] = {
  0b00000000,
  0b01111110,
  0b00000000,
  0b00000000,
  0b00000000,
  0b01111110,
  0b00000000,
  0b00000000
};

// 庆祝动画帧（3帧循环）
const uint8_t CELEBRATE_0[8] = {
  0b00000000,
  0b00011000,
  0b00111100,
  0b01111110,
  0b01111110,
  0b00111100,
  0b00011000,
  0b00000000
};

const uint8_t CELEBRATE_1[8] = {
  0b00011000,
  0b00111100,
  0b01100110,
  0b01000010,
  0b01000010,
  0b01100110,
  0b00111100,
  0b00011000
};

const uint8_t CELEBRATE_2[8] = {
  0b00111100,
  0b01000010,
  0b10000001,
  0b10000001,
  0b10000001,
  0b10000001,
  0b01000010,
  0b00111100
};

// 眨眼动画附加帧（happy + blink）
const uint8_t FACE_BLINK[8] = {
  0b00000000,
  0b00000000,
  0b01100110,
  0b00000000,
  0b00011000,
  0b10000001,
  0b01111110,
  0b00000000
};

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 初始化 LED
  strip.begin();
  strip.setBrightness(20);
  strip.show();

  // 启动 LED 启动动画
  startupAnimation();

  // 配置 AP
  WiFi.softAPConfig(apIP, apGateway, apSubnet);
  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println("AP started: " + String(AP_SSID));
  Serial.println("IP: " + WiFi.softAPIP().toString());

  // 注册路由
  server.on("/", handleRoot);
  server.on("/pet", handlePet);
  server.on("/alert", handleAlert);
  server.on("/status", handleStatus);
  server.onNotFound(handleNotFound);

  server.begin();
  Serial.println("HTTP server started");

  // 默认显示睡眠脸
  currentState = "sleep";
  drawFace(FACE_SLEEP, strip.Color(60, 60, 120));
}

void loop() {
  server.handleClient();
  updateDisplay();
  delay(10);
}

// ===== LED 绘制 =====
void drawFace(const uint8_t face[8], uint32_t color) {
  strip.clear();
  for (int row = 0; row < 8; row++) {
    for (int col = 0; col < 8; col++) {
      if (face[row] & (1 << (7 - col))) {
        int idx = row * 8 + col;
        strip.setPixelColor(idx, color);
      }
    }
  }
  strip.show();
}

void drawFaceDimmed(const uint8_t face[8], uint32_t color, float factor) {
  uint8_t r = (color >> 16) & 0xFF;
  uint8_t g = (color >> 8) & 0xFF;
  uint8_t b = color & 0xFF;

  r = (uint8_t)(r * factor);
  g = (uint8_t)(g * factor);
  b = (uint8_t)(b * factor);

  drawFace(face, strip.Color(r, g, b));
}

void clearLEDs() {
  strip.clear();
  strip.show();
}

// ===== 启动动画 =====
void startupAnimation() {
  for (int i = 0; i < LED_COUNT; i++) {
    strip.setPixelColor(i, strip.Color(0, 255, 0));
    strip.show();
    delay(20);
  }
  delay(200);
  for (int i = LED_COUNT - 1; i >= 0; i--) {
    strip.setPixelColor(i, strip.Color(0, 0, 0));
    strip.show();
    delay(15);
  }
}

// ===== 宠物状态管理 =====
void setPetState(String state) {
  petState = state;
  currentState = state;
  alertActive = false;
  animFrame = 0;
  Serial.println("Pet: " + state);

  if (state == "happy") {
    drawFace(FACE_HAPPY, strip.Color(0, 200, 50));   // 绿色开心

  } else if (state == "worried") {
    drawFace(FACE_WORRIED, strip.Color(255, 200, 0)); // 黄色担心

  } else if (state == "angry") {
    drawFace(FACE_ANGRY, strip.Color(255, 30, 0));   // 红色愤怒

  } else if (state == "sleep") {
    drawFace(FACE_SLEEP, strip.Color(60, 60, 180));  // 蓝色睡眠

  } else if (state == "celebrate") {
    currentState = "celebrate";
    animFrame = 0;
    // 不立即绘制，由 updateDisplay 处理动画

  } else {
    drawFace(FACE_SLEEP, strip.Color(60, 60, 120));
  }
}

// ===== 显示更新（处理动画 + 眨眼） =====
void updateDisplay() {
  unsigned long now = millis();

  // 警告闪烁
  if (alertActive) {
    if (now - alertStart > 3000) {
      // 3秒后停止闪烁
      alertActive = false;
      setPetState(petState);
      return;
    }
    if ((now / 200) % 2 == 0) {
      drawFace(FACE_ANGRY, strip.Color(255, 0, 0));
    } else {
      clearLEDs();
    }
    return;
  }

  // 庆祝动画
  if (currentState == "celebrate") {
    if (now - lastFrame > 300) {
      lastFrame = now;
      animFrame = (animFrame + 1) % 3;
      const uint8_t* frames[] = { CELEBRATE_0, CELEBRATE_1, CELEBRATE_2 };
      drawFace(frames[animFrame], strip.Color(255, 100, 0));
    }
    // 5秒后自动退出
    static unsigned long celebrateStart = 0;
    if (currentState == "celebrate" && celebrateStart == 0) celebrateStart = now;
    // 注: 简化处理，外部调用 setPetState 会重置
  }

  // Happy 状态：偶尔眨眼
  if (currentState == "happy" && (now / 3000) % 5 == 0) {
    // 每15秒眨一下（持续200ms）
    int blinkPhase = (now % 3000) / 200;
    if (blinkPhase == 0) {
      drawFace(FACE_BLINK, strip.Color(0, 180, 40));
      return;
    }
  }
}

// ===== 路由处理 =====
void handleRoot() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>FocusBuddy Matrix</title>
<style>
body{background:#1a1a2e;color:#e0e0e0;font-family:sans-serif;text-align:center;padding:20px}
h1{color:#ff6b35}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:320px;margin:20px auto}
.btn{padding:16px;border:none;border-radius:12px;font-size:18px;cursor:pointer;font-weight:600}
.btn-happy{background:#27ae60;color:#fff}
.btn-worried{background:#f39c12;color:#fff}
.btn-angry{background:#e74c3c;color:#fff}
.btn-sleep{background:#3498db;color:#fff}
.btn-celebrate{background:#ff6b35;color:#fff}
.btn-alert{background:#c0392b;color:#fff;padding:20px;font-size:24px;grid-column:span 2}
</style></head><body>
<h1>🐱 FocusBuddy</h1>
<p>ESP32 Matrix 控制面板</p>
<div class="grid">
<button class="btn btn-happy" onclick="call('/pet?state=happy')">😊 开心</button>
<button class="btn btn-worried" onclick="call('/pet?state=worried')">😟 担心</button>
<button class="btn btn-angry" onclick="call('/pet?state=angry')">😡 愤怒</button>
<button class="btn btn-sleep" onclick="call('/pet?state=sleep')">😴 睡觉</button>
<button class="btn btn-celebrate" onclick="call('/pet?state=celebrate')">🎉 庆祝</button>
<button class="btn btn-alert" onclick="call('/alert')">⚠️ 警告</button>
</div>
<script>
function call(url){fetch(url).then(function(r){return r.text()}).then(alert)}
</script>
</body></html>
)rawliteral";
  server.send(200, "text/html; charset=utf-8", html);
}

void handlePet() {
  String state = server.arg("state");
  if (state.length() > 0) {
    setPetState(state);
    server.send(200, "text/plain", "OK: " + state);
  } else {
    server.send(400, "text/plain", "Missing 'state' parameter");
  }
}

void handleAlert() {
  alertActive = true;
  alertStart = millis();
  server.send(200, "text/plain", "ALERT");
}

void handleStatus() {
  String json = "{";
  json += "\"state\":\"" + petState + "\",";
  json += "\"alert\":" + String(alertActive ? "true" : "false") + ",";
  json += "\"fps\":" + String(millis() % 1000); // placeholder
  json += "}";
  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "text/plain", "404 Not Found");
}
