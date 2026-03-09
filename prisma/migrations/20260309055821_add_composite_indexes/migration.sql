-- CreateIndex
CREATE INDEX "Clip_videoId_status_idx" ON "Clip"("videoId", "status");

-- CreateIndex
CREATE INDEX "Job_videoId_status_idx" ON "Job"("videoId", "status");

-- CreateIndex
CREATE INDEX "Video_userId_createdAt_idx" ON "Video"("userId", "createdAt");
