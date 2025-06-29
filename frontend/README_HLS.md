# HLS Adaptive Streaming Integration

This document explains how to use the new HLS (HTTP Live Streaming) adaptive streaming functionality in your poc-sync project.

## Overview

The project now supports HLS adaptive streaming, which automatically adjusts video quality based on the user's internet speed. This provides a better viewing experience by:

- Automatically switching between 360p and 720p based on bandwidth
- Allowing manual quality selection
- Providing smooth playback across different network conditions

## How to Use

### 1. Basic Usage

The HLS streaming is already integrated into your existing Host and Viewer components. You can toggle between HLS and regular video using the radio buttons.

### 2. Updating Video URLs

When you receive a new video conversion response, you can easily update the streaming URLs:

```javascript
import { updateVideoUrls } from './config';

// Your video conversion response
const response = {
  "message": "Video converted to HLS successfully",
  "videoId": "8255e8c1-8c33-4dd3-a894-7aba70926663",
  "masterPlaylist": "hls/8255e8c1-8c33-4dd3-a894-7aba70926663/master.m3u8",
  "streamingUrls": {
    "master": "https://stream.sync.videos.s3.amazonaws.com/hls/8255e8c1-8c33-4dd3-a894-7aba70926663/master.m3u8",
    "qualities": {
      "360p": "https://stream.sync.videos.s3.amazonaws.com/hls/8255e8c1-8c33-4dd3-a894-7aba70926663/360p/playlist.m3u8",
      "720p": "https://stream.sync.videos.s3.amazonaws.com/hls/8255e8c1-8c33-4dd3-a894-7aba70926663/720p/playlist.m3u8"
    }
  }
};

// Update the URLs
updateVideoUrls(response);
```

### 3. Demo Page

Visit `/demo` to see a demonstration of the HLS adaptive streaming functionality. This page includes:

- Live video player with adaptive quality
- Interface to update video URLs with new conversion responses
- Current configuration display
- Feature overview

## Components

### HLSVideo Component

The main component that handles HLS streaming:

```javascript
import HLSVideo from './HLSVideo';

<HLSVideo
  masterPlaylistUrl="https://your-master-playlist.m3u8"
  onVideoReady={(video) => {
    // Video is ready for use
  }}
  onPlay={() => {
    // Video started playing
  }}
  onPause={() => {
    // Video paused
  }}
  onSeek={(currentTime) => {
    // Video seeked to new time
  }}
  controls={true}
  className="your-custom-classes"
/>
```

### Configuration

All video URLs are centralized in `src/config.js`:

```javascript
export const VIDEO_CONFIG = {
  hls: {
    master: "https://your-master-playlist.m3u8",
    qualities: {
      "360p": "https://your-360p-playlist.m3u8",
      "720p": "https://your-720p-playlist.m3u8"
    }
  },
  fallback: 'https://your-fallback-video.mp4'
};
```

## Features

### Adaptive Quality
- Automatically switches between available qualities based on bandwidth
- Smooth transitions without interruption
- Fallback to lower quality if higher quality fails

### Manual Quality Control
- Users can manually select their preferred quality
- Quality selector shows available options with bitrate information
- "Auto" mode for automatic quality selection

### Cross-Browser Support
- Uses hls.js for Chrome, Firefox, Edge, and other browsers
- Native HLS support for Safari
- Graceful fallback to regular video if HLS is not supported

### Integration with Existing Sync
- Fully compatible with your existing socket-based synchronization
- Maintains all play, pause, and seek functionality
- No changes needed to your backend synchronization logic

## Browser Support

- **Chrome**: Full support via hls.js
- **Firefox**: Full support via hls.js
- **Safari**: Native HLS support
- **Edge**: Full support via hls.js
- **Mobile browsers**: Generally well supported

## Troubleshooting

### Video Not Loading
1. Check that the master playlist URL is accessible
2. Verify CORS settings on your S3 bucket
3. Ensure the video files are properly encoded for HLS

### Quality Not Switching
1. Check browser console for HLS.js errors
2. Verify that multiple quality levels are available in the manifest
3. Ensure network conditions allow for quality switching

### Sync Issues
1. Make sure the video element reference is properly set
2. Check that socket events are being emitted correctly
3. Verify that the video is fully loaded before attempting sync

## Example Response Format

Your video conversion service should return a response in this format:

```json
{
  "message": "Video converted to HLS successfully",
  "videoId": "unique-video-id",
  "masterPlaylist": "relative/path/to/master.m3u8",
  "streamingUrls": {
    "master": "https://full-url-to-master.m3u8",
    "qualities": {
      "360p": "https://full-url-to-360p.m3u8",
      "720p": "https://full-url-to-720p.m3u8"
    }
  }
}
```

## Next Steps

1. Test the demo page at `/demo`
2. Update your video conversion service to return the expected format
3. Integrate the `updateVideoUrls` function into your video upload flow
4. Test with different network conditions to verify adaptive quality switching 