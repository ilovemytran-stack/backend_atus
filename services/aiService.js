/**
 * AI Q&A Service — trợ lý hiểu Public + G.Legendary, dùng Cerebras (Llama, free tier).
 *
 * SETUP:
 * 1. npm install @cerebras/cerebras_cloud_sdk   (đã thêm vào package.json)
 * 2. Thêm CEREBRAS_API_KEY vào .env (xem .env.example) — lấy free tại
 *    https://cloud.cerebras.ai (chỉ cần email, không cần thẻ)
 *
 * ĐỔI TỪ ANTHROPIC SANG CEREBRAS (lịch sử): code bản trước dùng Anthropic SDK
 * nhưng .env chỉ có CEREBRAS_API_KEY (không có ANTHROPIC_API_KEY) — không khớp
 * nên trợ lý AI không chạy. File này viết lại để dùng đúng Cerebras, API dạng
 * OpenAI-compatible (khác cấu trúc response so với Anthropic — xem ghi chú ở
 * askAI()/generateCaption() bên dưới nếu sau này muốn đổi lại provider khác).
 */

const Cerebras = require('@cerebras/cerebras_cloud_sdk');
const GD = require('../data/gameData');

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

if (!process.env.CEREBRAS_API_KEY) {
  console.warn(
    '[aiService] CẢNH BÁO: thiếu CEREBRAS_API_KEY trong .env — trợ lý AI (/api/ai/chat) ' +
    'và gợi ý caption Atelier (/api/ai/caption) sẽ báo lỗi mỗi lần gọi. Lấy key free tại ' +
    'https://cloud.cerebras.ai rồi thêm vào .env (xem .env.example).'
  );
}

// Model nhanh, hợp Q&A khối lượng lớn, miễn phí. Cần chất lượng cao hơn (vd
// caption Atelier cần bám schema JSON chặt) thì dùng model lớn hơn bên dưới.
const MODEL_FAST = 'llama3.1-8b';
const MODEL_QUALITY = 'llama-3.3-70b';

/**
 * Build context từ gameData.js THẬT — tự đồng bộ mỗi khi bạn sửa game,
 * không cần đụng lại file này.
 */
function buildGameContext() {
  const parts = [];

  parts.push(`## 7 Lớp nhân vật (tối đa Lv.${GD.MAX_LEVEL})`);
  Object.values(GD.CLASSES).forEach((c) => {
    const skills = c.skills.map((s) => `${s.name} (${s.desc})`).join('; ');
    parts.push(`- ${c.name} — ${c.title}, vũ khí ${c.weaponType}. Chỉ số gốc: HP ${c.base.hp}, ATK ${c.base.atk}, DEF ${c.base.def}, SPD ${c.base.spd}, Ki ${c.base.ki}. Chiêu: ${skills}`);
  });

  parts.push('\n## Thế giới: 8 lục địa, mỗi lục địa 6 map theo thứ tự Hub → 3 map quái (A/B/C) → Boss → Thần');
  GD.CONTINENTS.forEach((cont) => {
    const monsterNames = cont.monsters.map((id) => GD.MONSTERS[id]?.nameVN || id).join(', ');
    parts.push(`- ${cont.name} (${cont.title}) — Thần hộ vệ: ${cont.god.name}, ${cont.god.title}. Quái: ${monsterNames}. Map: ${cont.maps.join(' → ')}.`);
  });

  parts.push(`\n## Lên cấp: mỗi ${GD.POINTS_EVERY} cấp được +${GD.STAT_POINTS_PER_TIER} điểm thuộc tính, +${GD.SKILL_POINTS_PER_TIER} điểm chiêu. Mỗi mốc 10 cấp mở 1 lời mời Thách Đấu Thần Linh (Duel) với 1 vị thần ngẫu nhiên.`);
  parts.push(`## Zone: mỗi map chia tối đa ${GD.ZONE_MAX_PER_MAP} khu vực, tối đa ${GD.ZONE_PLAYER_CAP} người chơi/khu vực.`);

  parts.push(`\n## Trang bị: ${GD.RARITY.length} phẩm chất theo thứ tự tăng dần — ${GD.RARITY.map((r) => GD.RARITY_LABEL[r]).join(' → ')}. 2 phẩm đầu (Thường/Hiếm) mua bằng vàng, 3 phẩm sau mua bằng kim cương (gem). Yêu cầu cấp vũ khí theo phẩm: ${JSON.stringify(GD.WEAPON_REQ_LEVEL)}. Yêu cầu cấp giáp: ${JSON.stringify(GD.ARMOR_REQ_LEVEL)}.`);

  parts.push('\n## Toàn bộ quái (24 loại, theo lục địa)');
  Object.values(GD.MONSTERS).forEach((m) => {
    parts.push(`- ${m.nameVN} / ${m.name} (${m.continent}): HP ${m.baseHp}, ATK ${m.baseAtk}, DEF ${m.baseDef} — chỉ số gốc, tăng theo cấp map khi spawn.`);
  });

  parts.push('\n## 10 Thần Linh Hộ Vệ (World Boss, xuất hiện định kỳ)');
  GD.BOSSES.forEach((b) => {
    parts.push(`- ${b.name} — ${b.title}, hệ ${b.element}: ${b.trait} Chiêu cuối: ${b.ult}.`);
  });

  parts.push('\n## Thú triệu hồi của Malakai');
  Object.values(GD.MINIONS).forEach((m) => {
    parts.push(`- ${m.nameVN} (${m.name})`);
  });

  parts.push(`\n## Tiền tệ: vàng + kim cương (gem) kiếm được trong game, và VIP Xu (nạp thật, đổi qua ví).`);

  return parts.join('\n');
}

const SYSTEM_PROMPT_HEADER = `Bạn là trợ lý AI của Public — mạng xã hội có tích hợp game G.Legendary (lấy cảm hứng từ Ngọc Rồng Online).

QUY TẮC:
- Chỉ trả lời câu hỏi về Public và G.Legendary (cách chơi, lớp nhân vật, map, quái, boss, trang bị, guild, trade, v.v.)
- Trả lời NGẮN GỌN, đúng trọng tâm, không lan man.
- Trả lời bằng ĐÚNG ngôn ngữ người dùng dùng để hỏi.
- Nếu thông tin không có trong dữ liệu bên dưới, nói rõ là không chắc — TUYỆT ĐỐI không bịa số liệu/chiêu thức không tồn tại.
- Câu hỏi ngoài phạm vi web/game thì lịch sự từ chối và hướng người dùng quay lại chủ đề.

DỮ LIỆU GAME HIỆN TẠI:
`;

/**
 * @param {string} userMessage
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @param {{displayName?: string}} [user] - req.user nếu đã đăng nhập (optionalAuth), bỏ qua nếu khách
 */
async function askAI(userMessage, history = [], user = null) {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('userMessage không hợp lệ');
  }

  let systemText = SYSTEM_PROMPT_HEADER + buildGameContext();
  if (user?.displayName) {
    systemText += `\n\nNgười dùng đang hỏi: ${user.displayName} (đã đăng nhập).`;
  }

  // API kiểu OpenAI-compatible: system prompt là 1 message role:'system' đầu
  // tiên trong mảng messages, KHÔNG phải tham số `system` riêng như Anthropic.
  // Cerebras cũng không có cache_control (prompt caching) như Anthropic — bỏ
  // qua tối ưu đó, chấp nhận trả full context mỗi lần gọi (đổi lại là tốc độ
  // inference của Cerebras rất nhanh nên vẫn ổn).
  const response = await cerebras.chat.completions.create({
    model: MODEL_FAST,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemText },
      ...history,
      { role: 'user', content: userMessage },
    ],
  });

  const reply = response.choices?.[0]?.message?.content || '';

  // usage.cache_read_input_tokens (Anthropic) không tồn tại ở Cerebras nên
  // luôn undefined -> route /chat tính cacheHit = false, không lỗi, chỉ là
  // chỉ báo "cache hit" sẽ luôn tắt (đúng thực tế, không phải bug).
  return { reply, usage: response.usage };
}

// Sinh title/mô tả/hashtag/caption gợi ý cho 1 video ngắn (dùng trong
// Atelier). Tách riêng khỏi askAI() ở trên vì khác hẳn nhiệm vụ — không phải
// Q&A game, không cần lịch sử hội thoại hay context game, và trả JSON thay
// vì text tự do. Dùng model chất lượng cao hơn vì cần bám đúng schema JSON.
const CAPTION_SYSTEM_PROMPT = 'Bạn là trợ lý sáng tạo nội dung video ngắn cho mạng xã hội. CHỈ trả lời bằng một object JSON hợp lệ duy nhất, KHÔNG kèm markdown, không giải thích thêm, đúng schema: {"title": string, "description": string, "hashtags": string[4], "caption": string}. Viết bằng tiếng Việt tự nhiên, giọng điệu phù hợp mạng xã hội, ngắn gọn, không dùng emoji quá nhiều.';

async function generateCaption(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('promptText không hợp lệ');
  }
  const response = await cerebras.chat.completions.create({
    model: MODEL_QUALITY,
    max_tokens: 1000,
    messages: [
      { role: 'system', content: CAPTION_SYSTEM_PROMPT },
      { role: 'user', content: 'Mô tả video của người dùng: ' + promptText },
    ],
  });
  const textOut = (response.choices?.[0]?.message?.content || '').trim();
  const parsed = JSON.parse(textOut.replace(/^```json\s*|```\s*$/g, ''));
  if (!parsed || !parsed.title) throw new Error('parse-fail');
  return parsed;
}

module.exports = { askAI, buildGameContext, generateCaption };
