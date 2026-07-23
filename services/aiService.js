/**
 * AI Q&A Service — trợ lý hiểu Public + G.Legendary, dùng Claude API (Haiku 4.5).
 *
 * SETUP:
 * 1. npm install @anthropic-ai/sdk   (đã thêm vào package.json)
 * 2. Thêm ANTHROPIC_API_KEY vào .env (xem .env.example)
 */

const Anthropic = require('@anthropic-ai/sdk');
const GD = require('../data/gameData');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model rẻ + nhanh, hợp Q&A khối lượng lớn. Cần suy luận sâu hơn (vd kiểm duyệt
// case khó ở Phase 2) thì đổi sang 'claude-sonnet-5'.
const MODEL = 'claude-haiku-4-5-20251001';

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

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: systemText,
        // Context game tĩnh, ít đổi -> cache lại, đỡ tốn token mỗi lần hỏi.
        // LƯU Ý: Haiku 4.5 cần block này >= ~4096 token mới thật sự kích hoạt cache;
        // context hiện tại (~2.5-3.5k token tuỳ cách đếm) có thể CHƯA đủ ngưỡng.
        // Không sao — code vẫn chạy đúng, chỉ là chưa tiết kiệm được cho tới khi bạn
        // thêm data (vd đủ 48 map + full bảng giá vũ khí/giáp) hoặc đổi model sang
        // claude-sonnet-5 (ngưỡng cache thấp hơn, chỉ ~1024 token).
        // Kiểm tra thực tế qua field usage.cache_read_input_tokens ở response (log trong route).
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [...history, { role: 'user', content: userMessage }],
  });

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  return { reply, usage: response.usage };
}

// Sinh title/mô tả/hashtag/caption gợi ý cho 1 video ngắn (dùng trong
// Atelier). Tách riêng khỏi askAI() ở trên vì khác hẳn nhiệm vụ — không phải
// Q&A game, không cần lịch sử hội thoại hay context game, và trả JSON thay
// vì text tự do.
const CAPTION_SYSTEM_PROMPT = 'Bạn là trợ lý sáng tạo nội dung video ngắn cho mạng xã hội. CHỈ trả lời bằng một object JSON hợp lệ duy nhất, KHÔNG kèm markdown, không giải thích thêm, đúng schema: {"title": string, "description": string, "hashtags": string[4], "caption": string}. Viết bằng tiếng Việt tự nhiên, giọng điệu phù hợp mạng xã hội, ngắn gọn, không dùng emoji quá nhiều.';

async function generateCaption(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    throw new Error('promptText không hợp lệ');
  }
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: CAPTION_SYSTEM_PROMPT + '\n\nMô tả video của người dùng: ' + promptText }],
  });
  const textOut = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  const parsed = JSON.parse(textOut.replace(/^```json\s*|```\s*$/g, ''));
  if (!parsed || !parsed.title) throw new Error('parse-fail');
  return parsed;
}

module.exports = { askAI, buildGameContext, generateCaption };
