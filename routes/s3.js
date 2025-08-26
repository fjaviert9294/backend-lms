const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

router.post('/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const bucket = process.env.AWS_S3_BUCKET;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: fileType
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutos

    res.json({ url });
  } catch (error) {
    console.error('Error generando pre-signed URL:', error);
    res.status(500).json({ success: false, message: 'Error generando pre-signed URL' });
  }
});

module.exports = router;