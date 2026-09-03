// Lambda function to sanitize JPG files for AWS MediaConvert compatibility
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const aaa = 123412341234;

  const sourceBucket = event.srcBucket;
  const sourceKey = event.srcVideo;

  if (!sourceBucket) {
    console.error("Error: event.srcBucket is not defined");
    throw new Error("event.srcBucket is not defined");
  }
  if (!sourceKey) {
    console.error("Error: event.srcVideo is not defined");
    throw new Error("event.srcVideo is not defined");
  }

  try {
    const s3Client = new S3Client({ region: "us-east-1" });
    const getObjectParams = {
      Bucket: sourceBucket,
      Key: sourceKey,
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);
    const fileBuffer = await response.Body.transformToByteArray();
    const fileTypeResult = await fileTypeFromBuffer(fileBuffer);
    console.log("File Type:", fileTypeResult);

    if (fileTypeResult && (fileTypeResult.mime === "image/jpeg" || fileTypeResult.mime === "image/jpg")) {
      // Sanitize JPG: ensure baseline JPEG, remove metadata, set color space to sRGB
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();
      console.log("Original metadata:", metadata);

      // Remove metadata, set color space, ensure baseline JPEG
      const sanitizedBuffer = await image
        .rotate() // normalize orientation
        .removeAlpha()
        .toColourspace("srgb")
        .jpeg({
          quality: 100,
          progressive: false,
          chromaSubsampling: "4:2:0",
          optimizeCoding: true,
          force: true,
        })

        .withMetadata({ exif: undefined, icc: undefined })
        .toBuffer();

      // Upload sanitized image back to S3
      const uploadParams = {
        Bucket: sourceBucket,
        Key: sourceKey,
        Body: sanitizedBuffer,
        ContentType: "image/jpeg",
      };
      const uploadCommand = new PutObjectCommand(uploadParams);
      await s3Client.send(uploadCommand);
      console.log("Sanitization complete. Uploaded sanitized JPG to S3:", `s3://${sourceBucket}/${sourceKey}`);
      return event;
    } else {
      console.log("File is not a JPG. Returning event unchanged.");
      return event;
    }
  } catch (error) {
    console.error("Error during JPG sanitization:", error);
    throw error;
  }
};
