import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

export const handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const sourceBucket = event.srcBucket;
  const sourceKey = event.srcVideo;

  if (!sourceBucket) {
    console.error("Error: event.srcBucket is not defined");
    throw new Error(event, "event.srcBucket is not defined");
  }
  if (!sourceKey) {
    console.error("Error: event.srcVideo is not defined");
    throw new Error(event, "event.srcVideo is not defined");
  }

  //Wednesday: now convert PNG files

  try {
    const s3Client = new S3Client({ region: "us-east-1" }); // Replace with your region if different
    const getObjectParams = {
      Bucket: sourceBucket,
      Key: sourceKey,
    };
    const getObjectCommand = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(getObjectCommand);
    const fileBuffer = await response.Body.transformToByteArray();
    const fileTypeResult = await fileTypeFromBuffer(fileBuffer);
    console.log("File Type:", fileTypeResult);

    if (fileTypeResult.mime === "image/png") {
      console.log("this is png, convert");
      const image = sharp(fileBuffer);
      const metadata = await image.metadata();
      let contentType = fileTypeResult.mime;

      console.log("Converting PNG to 24-bit (removing alpha channel)");
      const convertedBuffer = await image.toColourspace("srgb").removeAlpha().png().toBuffer();

      // Upload the converted buffer to S3
      const destinationKey = sourceKey.replace(".png", "_24bit.png"); // Example: Replace original key with a new one
      const uploadParams = {
        Bucket: sourceBucket, // Use the same bucket or specify a different one
        Key: sourceKey,
        Body: convertedBuffer,
        ContentType: "image/png", // Set the correct content type
      };
      const uploadCommand = new PutObjectCommand(uploadParams);

      console.log("Before Uploading:");
      console.log(uploadParams);
      console.log("Checking Content Type:");
      console.log(contentType);

      await s3Client.send(uploadCommand);
      console.log("Conversion complete. New buffer size:", convertedBuffer.length);
      console.log("Uploaded converted image to S3:", `s3://${sourceBucket}/${sourceKey}`);

      console.log("Conversion complete. New buffer size:", convertedBuffer.length);
      console.log("returning event for png");
      return event;
    } else {
      console.log("returning event for non png");
      return event;
    }
  } catch (error) {
    console.error("Error:", error);
  }
};
