const router = require('express').Router();
const AtelierProject = require('../models/AtelierProject');
const { protect } = require('../middleware/auth');

function toClient(doc) {
  return {
    id: doc._id,
    kind: doc.kind,
    name: doc.name,
    thumbnail: doc.thumbnail,
    coverOverride: doc.coverOverride,
    state: doc.state,
    createdAt: doc.createdAt.getTime(),
    updatedAt: doc.updatedAt.getTime(),
  };
}

// Danh sách rút gọn (không kèm "state" nặng) để hiển thị lưới dự án ở trang chủ Atelier
router.get('/', protect, async (req, res) => {
  try {
    const docs = await AtelierProject.find({ userId: req.user._id }).select('-state').sort({ updatedAt: -1 });
    res.json({
      success: true,
      projects: docs.map(d => ({
        id: d._id, kind: d.kind, name: d.name, thumbnail: d.thumbnail,
        createdAt: d.createdAt.getTime(), updatedAt: d.updatedAt.getTime(),
      })),
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await AtelierProject.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: 'Không tìm thấy dự án' });
    res.json({ success: true, project: toClient(doc) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Upsert: id do CLIENT sinh sẵn (uid() trong atelier.html) từ lúc tạo project,
// nên tạo mới và cập nhật dùng chung 1 route PUT này (xem ghi chú trong model).
router.put('/:id', protect, async (req, res) => {
  try {
    const { kind, name, thumbnail, coverOverride, state } = req.body;
    if (!['photo', 'video'].includes(kind)) {
      return res.status(400).json({ success: false, message: 'kind không hợp lệ' });
    }
    const doc = await AtelierProject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { kind, name, thumbnail, coverOverride, state }, $setOnInsert: { userId: req.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, project: toClient(doc) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await AtelierProject.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Xoá toàn bộ dự án của user hiện tại (dùng cho nút "xoá tất cả")
router.delete('/', protect, async (req, res) => {
  try {
    await AtelierProject.deleteMany({ userId: req.user._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
