// ==UserScript==
// @name         YouTube Subscription Feed Organizer
// @version      2.1
// @description  Groups videos on the YouTube subscriptions feed by channel into collapsible sections with channel thumbnail, channel name, first video name, and video count. Shows about 4 groups per row. Single-video groups open immediately.
// @author       Cubicake
// @match        https://www.youtube.com/feed/subscriptions*
// ==/UserScript==

(function() {
    'use strict';

    // Store expanded state per channel.
    const expandedChannels = {};

    // Retrieve the container holding subscription videos.
    function getContainer() {
        return document.querySelector("ytd-rich-grid-renderer #contents") || document.querySelector("#contents");
    }

    // Scroll the page for a fixed duration to force YouTube to load thumbnails.
    function forceLoadThumbnails(callback) {
        const scrollDuration = 1000; // Scroll for 1 second.
        const scrollStep = 1000; // Scroll 1000px at a time.
        const scrollInterval = 50; // Scroll every 50ms for faster scrolling.

        let startTime = Date.now();

        const scroll = () => {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime < scrollDuration) {
                window.scrollBy(0, scrollStep);
                setTimeout(scroll, scrollInterval);
            } else {
                // Once scrolling is complete, wait a bit for thumbnails to load.
                setTimeout(callback, 10);
            }
        };

        scroll();
    }

    // Extract video ID from the video element.
    function getVideoId(videoElement) {
        const videoLink = videoElement.querySelector("a#thumbnail");
        if (videoLink && videoLink.href) {
            const url = new URL(videoLink.href);
            return url.searchParams.get("v");
        }
        return null;
    }

    // Construct thumbnail URL from video ID.
    function getThumbnailUrl(videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    function groupVideos() {
        window.scrollTo(0, 0);
        const container = getContainer();
        if (!container) return;

        // Find all video items.
        const videoItems = Array.from(container.querySelectorAll("ytd-rich-item-renderer"));
        if (videoItems.length === 0) return;

        // Group videos by channel name.
        const grouped = {};
        videoItems.forEach(item => {
            const channelLink = item.querySelector("ytd-channel-name a");
            if (!channelLink) return;
            const channelName = channelLink.textContent.trim();
            if (!grouped[channelName]) {
                grouped[channelName] = [];
            }
            grouped[channelName].push(item);
        });

        // Create a wrapper that displays channel groups in a flex grid.
        const gridWrapper = document.createElement("div");
        gridWrapper.style.display = "flex";
        gridWrapper.style.flexWrap = "wrap";
        gridWrapper.style.justifyContent = "flex-start";
        gridWrapper.style.gap = "10px";

        // Create a section for each channel.
        Object.entries(grouped).forEach(([channelName, items]) => {
            const section = document.createElement("div");
            section.style.flex = "0 0 calc(25% - 10px)"; // 4 groups per row.
            section.style.boxSizing = "border-box";
            section.style.marginBottom = "20px";
            section.style.border = "1px solid #ccc";
            section.style.borderRadius = "5px";
            section.style.backgroundColor = "#f0f0f0";
            section.style.overflow = "hidden"; // Ensure content doesn't overflow.

            // Create header container.
            const header = document.createElement("div");
            header.style.cursor = "pointer";
            header.style.display = "flex";
            header.style.flexDirection = "column";
            header.style.alignItems = "center";
            header.style.padding = "10px";
            header.title = channelName;

            // Create thumbnail image.
            const thumbImg = document.createElement("img");
            thumbImg.style.width = "100%"; // Thumbnail width matches category width.
            thumbImg.style.height = "auto";
            thumbImg.style.marginBottom = "10px";
            thumbImg.style.objectFit = "cover";
            thumbImg.style.borderRadius = "5px";

            // Set the thumbnail source.
            const firstItem = items[0];
            const videoId = getVideoId(firstItem);
            if (videoId) {
                thumbImg.src = getThumbnailUrl(videoId);
            } else {
                // Fallback: Use a placeholder image if video ID is not found.
                thumbImg.src = "https://via.placeholder.com/320x180";
            }

            // Get the first video's title.
            const videoTitleElement = firstItem.querySelector("#video-title");
            const videoTitle = videoTitleElement ? videoTitleElement.textContent.trim() : "No Title";

            // Create a text container with channel name and video title.
            const headerText = document.createElement("div");
            headerText.style.display = "flex";
            headerText.style.flexDirection = "column";
            headerText.style.alignItems = "center";
            headerText.style.fontSize = "14px";
            headerText.style.width = "100%"; // Ensure text container matches category width.
            headerText.style.textAlign = "center";
            headerText.innerHTML = `
                <strong>${channelName}</strong>
                <span style="color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">${videoTitle}</span>
                <span>${items.length} video${items.length > 1 ? "s" : ""}</span>
            `;

            header.appendChild(thumbImg);
            header.appendChild(headerText);

            // Create a wrapper for videos.
            const videosWrapper = document.createElement("div");
            videosWrapper.style.display = expandedChannels[channelName] ? "block" : "none";
            items.forEach(item => videosWrapper.appendChild(item));

            // Click event: if one video, open it; otherwise toggle the group.
            header.addEventListener("click", () => {
                if (items.length === 1) {
                    const videoLink = items[0].querySelector("a#thumbnail");
                    if (videoLink && videoLink.href) {
                        window.location.href = videoLink.href;
                    }
                } else {
                    expandedChannels[channelName] = !expandedChannels[channelName];
                    videosWrapper.style.display = expandedChannels[channelName] ? "block" : "none";
                }
            });

            section.appendChild(header);
            section.appendChild(videosWrapper);
            gridWrapper.appendChild(section);
        });

        // Replace container's content with the grid wrapper.
        container.innerHTML = "";
        container.appendChild(gridWrapper);
    }

    // Initialize grouping after forcing thumbnails to load.
    function initGrouping() {
        forceLoadThumbnails(groupVideos);
    }

    // Listen for page updates.
    window.addEventListener("yt-page-data-updated", initGrouping);
    window.addEventListener("load", initGrouping);
})();
