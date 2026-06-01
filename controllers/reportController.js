const MedicalRecord = require('../models/MedicalRecord');
const { cloudinary } = require('../config/cloudinary');
const { OpenAI } = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

exports.getReports = async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({ user: req.user.id });
    if (!record) {
      req.flash('error_msg', 'Please create your medical profile first.');
      return res.redirect('/profile/edit');
    }
    // Sort reports so newest are first
    const reports = record.reports.sort((a, b) => b.uploadedAt - a.uploadedAt);
    res.render('pages/reports', { reports });
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error');
    res.redirect('/dashboard');
  }
};

exports.uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      req.flash('error_msg', 'No file selected or unsupported format.');
      return res.redirect('/reports');
    }
    
    const { title } = req.body;
    if (!title) {
      req.flash('error_msg', 'Please provide a title for the report');
      return res.redirect('/reports');
    }

    const record = await MedicalRecord.findOne({ user: req.user.id });
    
    const newReport = {
      title,
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename,
      fileType: req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'
    };

    record.reports.push(newReport);
    await record.save();

    req.flash('success_msg', 'Report uploaded successfully to the cloud.');
    res.redirect('/reports');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error during upload');
    res.redirect('/reports');
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const record = await MedicalRecord.findOne({ user: req.user.id });
    
    const reportIndex = record.reports.findIndex(r => r._id.toString() === reportId);
    if (reportIndex === -1) {
      req.flash('error_msg', 'Report not found');
      return res.redirect('/reports');
    }

    const report = record.reports[reportIndex];
    
    // Delete from Cloudinary
    if (report.fileType === 'pdf') {
       await cloudinary.uploader.destroy(report.cloudinaryId, { resource_type: 'raw' });
    } else {
       await cloudinary.uploader.destroy(report.cloudinaryId);
    }
    
    // Remove from DB
    record.reports.splice(reportIndex, 1);
    await record.save();

    req.flash('success_msg', 'Report deleted permanently.');
    res.redirect('/reports');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Server error deleting report');
    res.redirect('/reports');
  }
};

exports.analyzeReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const record = await MedicalRecord.findOne({ user: req.user.id });
    
    if (!record) {
      return res.status(404).json({ error: 'Medical record not found' });
    }

    const reportIndex = record.reports.findIndex(r => r._id.toString() === reportId);
    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = record.reports[reportIndex];

    // If summary already exists, return cached version
    if (report.aiSummary) {
      return res.json({ summary: report.aiSummary });
    }

    if (!openai) {
      return res.status(500).json({ error: 'AI analysis is currently unavailable (API Key missing).' });
    }

    // Format Cloudinary URL. If PDF, change extension to .jpg to extract the first page as an image for Vision API.
    let imageUrl = report.fileUrl;
    if (report.fileType === 'pdf') {
       imageUrl = imageUrl.replace(/\.pdf$/, '.jpg');
    }

    const prompt = `You are an expert medical AI assistant. Analyze this medical report carefully. Provide a short, structured, and easy-to-understand summary of the key findings. Highlight any abnormal values and provide a brief explanation suitable for a patient to show to their doctor. Do not include raw markdown wrappers like \`\`\`html. Use standard basic HTML tags like <b>, <ul>, <li>, <p>, and <br> to format your response beautifully.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ]
    });

    const aiSummary = response.choices[0].message.content;

    // Save back to MongoDB
    record.reports[reportIndex].aiSummary = aiSummary;
    await record.save();

    return res.json({ summary: aiSummary });

  } catch (err) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: 'Failed to analyze report with AI.' });
  }
};
