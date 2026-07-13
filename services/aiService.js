/**
 * AI Q&A Service — trợ lý hiểu Public + G.Legendary.
 * Provider: Cerebras (model gpt-oss-120b) — free tier 14.400 request/ngày,
 * 900/giờ, 30/phút, 1 triệu token/ngày, KHÔNG cần thẻ tín dụng.
 * (xem https://github.com/cheahjs/free-llm-api-resources)
 *
 * SETUP:
 * 1. Lấy API key free tại https://cloud.cerebras.ai (đăng ký bằng email)
 * 2. Thêm CEREBRAS_API_KEY vào .env (xem .env.example)
 *
 * GHI CHÚ đổi từ Claude sang đây: mất prompt cache (cache_control) vì đó là
 * tính năng riêng của Anthropic — Cerebras chuẩn OpenAI-compatible, không có
 * cache. Đổi lại quota free cao hơn nhiều so với trả phí theo token của Claude.
 * Nếu sau này cần model suy luận sâu hơn mà gpt-oss-120b không đáp ứng nổi,
 * đổi hằng số MODEL bên dưới sang 'llama-4-scout' hoặc 'qwen-3-32b' (cùng free
 * tier Cerebras), hoặc quay lại Claude (Anthropic SDK đã gỡ khỏi package.json).
 */

const GD = require('../data/gameData');

const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// Model 120B — mạnh nhất trong free tier Cerebras, vẫn giữ quota 14.400 req/ngày.
const MODEL = 'gpt-oss-120b';

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
  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error('Thiếu CEREBRAS_API_KEY trong .env');
  }

  let systemText = SYSTEM_PROMPT_HEADER + buildGameContext();
  if (user?.displayName) {
    systemText += `\n\nNgười dùng đang hỏi: ${user.displayName} (đã đăng nhập).`;
  }

  // Cerebras dùng chuẩn OpenAI-compatible: system là 1 message role 'system'
  // nằm đầu mảng messages, không có field system/cache_control riêng như Claude.
  const res = await fetch(CEREBRAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemText },
        ...history,
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Cerebras API lỗi ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || '';

  return { reply, usage: data.usage };
}

module.exports = { askAI, buildGameContext };
