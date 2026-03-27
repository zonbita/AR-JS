const mv = document.getElementById("mv");
const customAR = document.getElementById("customAR");
const monthPreview = document.getElementById("monthPreview");
const monthPreviewWrap = document.querySelector(".month-preview-wrap");
const bgm = document.getElementById("bgm");
const btnGroup = document.getElementById("btnGroup");
const visitBtn = document.getElementById("visitBtn");
const textBanner = document.querySelector(".text-banner");
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

let firstAnim = null;
let arActivated = false;
let isModelLoaded = false;
let isAudioLoaded = false;
let cameraPermissionGranted = false;
let cameraStream = null;

// Function to get URL parameters
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// Function to get current month from URL or default to 1
function getCurrentMonth() {
  const month = getUrlParameter("month");
  return month ? parseInt(month) : 1;
}

// Tracking state management
const trackingState = {
  // Cooldown periods (in milliseconds)
  cooldowns: {
    link: 60000,    // 1 minute for link tracking
    button: 30000,  // 30 seconds for button clicks
    explore: 30000, // 30 seconds for explore button
  },
  
  // Get last tracking time for a specific type
  getLastTrackTime(type) {
    const key = `lastTrack_${type}`;
    const stored = sessionStorage.getItem(key);
    return stored ? parseInt(stored) : 0;
  },
  
  // Set last tracking time for a specific type
  setLastTrackTime(type) {
    const key = `lastTrack_${type}`;
    sessionStorage.setItem(key, Date.now().toString());
  },
  
  // Check if tracking is allowed (cooldown period has passed)
  canTrack(type) {
    const lastTrack = this.getLastTrackTime(type);
    const cooldown = this.cooldowns[type] || 30000;
    const now = Date.now();
    return (now - lastTrack) >= cooldown;
  },
  
  // Check if link was already tracked in this session
  isLinkTracked() {
    const key = `linkTracked_${window.location.href}`;
    return sessionStorage.getItem(key) === "true";
  },
  
  // Mark link as tracked in this session
  markLinkTracked() {
    const key = `linkTracked_${window.location.href}`;
    sessionStorage.setItem(key, "true");
  }
};

// Function to track access via API
async function trackAccess(type, month) {
  try {
    // For link tracking: check if already tracked in this session
    if (type === "link" && trackingState.isLinkTracked()) {
      console.log("Link already tracked in this session, skipping...");
      return;
    }
    
    // Check cooldown period for all types
    if (!trackingState.canTrack(type)) {
      const cooldown = trackingState.cooldowns[type] / 1000;
      console.log(`Tracking cooldown active. Please wait ${cooldown} seconds before tracking ${type} again.`);
      return;
    }
    
    const currentLink = window.location.href;
    const timestamp = new Date().toISOString();

    const trackingData = {
      type: type, // "link", "button", or "explore"
      month: month,
      link: currentLink,
      timestamp: timestamp,
    };

    const response = await fetch("https://api-giftcode.mhdpharma.com/api/access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(trackingData),
    });

    if (!response.ok) {
      console.error("Failed to track access:", response.statusText);
      return;
    }
    
    // Mark as tracked after successful API call
    trackingState.setLastTrackTime(type);
    if (type === "link") {
      trackingState.markLinkTracked();
    }
    
    console.log(`Successfully tracked ${type} access for month ${month}`);
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.error("Error tracking access:", error);
  }
}

// Lazy loading functions
function loadFloatingElements() {
  const floatingElements = document.querySelectorAll(".floating-element");
  floatingElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add("lazy-loaded");
    }, index * 100);
  });
}

function preloadAudio(audioSrc) {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.oncanplaythrough = () => {
      isAudioLoaded = true;
      resolve();
    };
    audio.onerror = () => reject();
    audio.src = audioSrc;
  });
}

// Function to update model and audio based on month
function updateContentForMonth(month) {
  // Update model source
  const modelSrc = `module/source/month${month}/baby${month}.glb`;
  const iosSrc = `module/source/month${month}/baby${month}.usdz`;

  mv.setAttribute("src", modelSrc);
  mv.setAttribute("ios-src", iosSrc);
  mv.setAttribute("alt", `BABY${month}M`);

  if (month === 9) {
    mv.setAttribute("camera-controls", "");
    mv.setAttribute("min-camera-orbit", "45deg 90deg 0.8m");
    mv.setAttribute("max-camera-orbit", "45deg 90deg 3.0m");
  } else {
    mv.setAttribute("camera-controls", "");
    mv.removeAttribute("min-camera-orbit");
    mv.removeAttribute("max-camera-orbit");
  }

  // Update audio source with lazy loading
  const audioSrc = `module/source/month${month}/voice${month}.MP3`;
  bgm.setAttribute("src", audioSrc);

  // Update month preview image
  if (monthPreview) {
    monthPreview.src = `module/img/Month${month}.png`;
    monthPreview.alt = `Ảnh tháng ${month}`;
  }

  // Preload audio in background
  preloadAudio(audioSrc).catch(() => {
    console.log("Audio preload failed, will load on demand");
  });

  // Update banner text
  updateBannerTextForMonth(month);
}

// Function to update banner text for specific month
function updateBannerTextForMonth(month) {
  const bannerText = document.querySelector(".banner-text");
  if (bannerText) {
    bannerText.textContent = `Lắng nghe Lời thì thầm từ con - THÁNG ${month}`;
  }
}

// Function to check and request camera permission
async function checkCameraPermission() {
  try {
    // Kiểm tra xem Permissions API có được hỗ trợ không
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({
        name: "camera",
      });

      if (permissionStatus.state === "granted") {
        cameraPermissionGranted = true;
        return true;
      } else if (permissionStatus.state === "prompt") {
        // Quyền chưa được cấp, sẽ yêu cầu khi cần
        return false;
      } else if (permissionStatus.state === "denied") {
        console.log("Camera permission denied");
        return false;
      }

      // Theo dõi thay đổi trạng thái quyền
      permissionStatus.onchange = () => {
        if (permissionStatus.state === "granted") {
          cameraPermissionGranted = true;
        }
      };
    }
  } catch (err) {
    // Permissions API không được hỗ trợ hoặc camera không khả dụng
    console.log("Permissions API not supported or camera not available");
  }
  return false;
}

// Function to request camera access
async function requestCameraAccess() {
  try {
    // Yêu cầu quyền camera một lần, trình duyệt sẽ nhớ quyền này
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    cameraPermissionGranted = true;
    cameraStream = stream;
    return stream;
  } catch (err) {
    console.error("Không thể truy cập camera:", err);
    cameraPermissionGranted = false;

    // Hiển thị thông báo lỗi thân thiện
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      alert(
        "Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt để sử dụng tính năng AR."
      );
    } else if (
      err.name === "NotFoundError" ||
      err.name === "DevicesNotFoundError"
    ) {
      alert("Không tìm thấy camera trên thiết bị của bạn.");
    } else {
      alert("Không thể mở camera. Vui lòng kiểm tra quyền truy cập camera.");
    }

    throw err;
  }
}

// Function to check AR support
function checkARSupport() {
  // Check for WebXR support
  if ("xr" in navigator) {
    return navigator.xr
      .isSessionSupported("immersive-ar")
      .then((supported) => {
        return supported;
      })
      .catch(() => {
        return false;
      });
  }

  // Check for iOS AR Quick Look support
  if (isIOS) {
    return new Promise((resolve) => {
      // iOS devices with iOS 12+ support AR Quick Look
      const iOSVersion = navigator.userAgent.match(/OS (\d+)_/);
      if (iOSVersion && parseInt(iOSVersion[1]) >= 12) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  // Check for Android ARCore support
  if (/Android/i.test(navigator.userAgent)) {
    return new Promise((resolve) => {
      // Basic Android AR support check
      resolve(true);
    });
  }

  // Default to false for unsupported devices
  return Promise.resolve(false);
}

// Function to show AR not supported message
function showARNotSupportedMessage() {
  // Create modal overlay
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: 'Nunito', sans-serif;
  `;

  // Create modal content
  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    max-width: 350px;
    margin: 20px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;

  // Create message
  const message = document.createElement("div");
  message.style.cssText = `
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
    line-height: 1.4;
  `;
  message.textContent = "Thiết bị của bạn không hỗ trợ AR";

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
    background: #FF6B6B;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s ease;
  `;
  closeBtn.textContent = "Đóng";
  closeBtn.onmouseover = () => (closeBtn.style.background = "#FF5252");
  closeBtn.onmouseout = () => (closeBtn.style.background = "#FF6B6B");

  // Add click handler to close modal
  closeBtn.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Add click handler to close modal when clicking overlay
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Assemble modal
  modalContent.appendChild(message);
  modalContent.appendChild(closeBtn);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}

// Function to update banner text after 1 minute
function updateBannerText() {
  const bannerText = document.querySelector(".banner-text");
  if (bannerText) {
    bannerText.innerHTML = `
      Mẹ khám phá TRỌN VẸN 9 THÁNG trưởng thành của con tại "Khám phá thêm" nhé
    `;
  }
}

// Function to set initial banner text
function setInitialBannerText() {
  const bannerText = document.querySelector(".banner-text");
  if (bannerText) {
    const currentMonth = getCurrentMonth();
    bannerText.textContent = `Lắng nghe Lời thì thầm từ con - THÁNG ${currentMonth}`;
  }
}

// Intersection Observer for lazy loading
function setupIntersectionObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("lazy-loaded");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "50px",
    }
  );

  // Observe floating elements
  document.querySelectorAll(".floating-element").forEach((el) => {
    observer.observe(el);
  });
}

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Lazy load resources based on user interaction
function setupLazyResourceLoading() {
  // Load audio when user first interacts
  let audioLoaded = false;
  const loadAudio = () => {
    if (!audioLoaded && bgm.src) {
      bgm.load();
      audioLoaded = true;
    }
  };

  // Load audio on first user interaction
  document.addEventListener("click", loadAudio, { once: true });
  document.addEventListener("touchstart", loadAudio, { once: true });
  document.addEventListener("keydown", loadAudio, { once: true });
}

// Initialize content based on URL parameter
document.addEventListener("DOMContentLoaded", function () {
  const currentMonth = getCurrentMonth();
  updateContentForMonth(currentMonth);

  // Track link access when page loads
  trackAccess("link", currentMonth);

  // Kiểm tra quyền camera khi trang được tải (không yêu cầu nếu chưa có quyền)
  checkCameraPermission().then((granted) => {
    if (granted) {
      console.log("Camera permission already granted");
    }
  });

  // Setup intersection observer for lazy loading
  setupIntersectionObserver();

  // Setup lazy resource loading
  setupLazyResourceLoading();

  // Load floating elements with lazy loading
  setTimeout(() => {
    loadFloatingElements();
  }, 500);

  // Animate month image on first load (same style as buttons)
  setTimeout(() => {
    if (monthPreviewWrap) {
      monthPreviewWrap.classList.add("show");
    }
  }, 500);
});

setTimeout(() => {
  if (typeof textBanner !== "undefined" && textBanner) {
    textBanner.classList.add("show", "lazy-loaded");
  }
}, 1000);

// Show visit button immediately on page load
function showVisitButtonImmediately() {
  // Set initial banner text
  setInitialBannerText();

  // Show the button right away
  visitBtn.style.display = "flex";
  visitBtn.classList.add("show");
}

// Show the button when page loads
showVisitButtonImmediately();

// Debounced button click handler to prevent rapid multiple clicks
let isARButtonProcessing = false;

customAR.addEventListener("click", async (event) => {
  event.preventDefault();
  
  // Prevent multiple rapid clicks
  if (isARButtonProcessing) {
    console.log("AR button click already processing, please wait...");
    return;
  }
  
  isARButtonProcessing = true;

  // Track button click (Xem AR)
  const currentMonth = getCurrentMonth();
  trackAccess("button", currentMonth);

  // Logic kiểu AR-JS: mở camera nền + overlay model-viewer, xử lý audio theo iOS/Android
  let stream = null;
  let videoEl = null;
  let closeBtn = null;
  let fadeCover = null;
  let iosTap = null;

  const cleanup = () => {
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (_) {}
    if (videoEl && videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
    if (closeBtn && closeBtn.parentNode)
      closeBtn.parentNode.removeChild(closeBtn);
    if (fadeCover && fadeCover.parentNode)
      fadeCover.parentNode.removeChild(fadeCover);
    if (iosTap && iosTap.parentNode) iosTap.parentNode.removeChild(iosTap);

    // Khôi phục model-viewer
    mv.style.cssText = "opacity: 1; transition: opacity 0.5s ease;";

    // Dừng nhạc khi đóng
    bgm.pause();
    bgm.currentTime = 0;

    // Hiện lại nút
    customAR.style.display = "block";
    
    // Reset processing flag
    isARButtonProcessing = false;
  };

  try {
    // Kiểm tra và yêu cầu quyền camera (chỉ hỏi một lần, sau đó trình duyệt nhớ)
    if (!cameraPermissionGranted) {
      await checkCameraPermission();
    }

    // Bật camera sau (back) - nếu đã có quyền, không hỏi lại
    stream = await requestCameraAccess();

    // Tạo nền camera toàn màn hình
    videoEl = document.createElement("video");
    videoEl.id = "cameraBg";
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true; // tránh bật audio camera
    videoEl.srcObject = stream;
    videoEl.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      object-fit: cover;
      z-index: 1000;
    `;
    document.body.appendChild(videoEl);

    // Fade cover
    fadeCover = document.createElement("div");
    fadeCover.id = "fadeCover";
    fadeCover.style.cssText = `
      position: fixed; inset: 0; background:#000; z-index:1002; opacity:1; transition: opacity 1.2s ease;
    `;
    document.body.appendChild(fadeCover);

    // Đặt model-viewer ở giữa, nổi trên camera
    mv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100vw;
      height: 100vh;
      background: transparent;
      z-index: 1001;
      opacity: 1;
      touch-action: pan-y;
    `;

    // Phát animation đầu tiên nếu có
    if (firstAnim) {
      mv.animationName = firstAnim;
      mv.animationLoop = true;
      mv.currentTime = 0;
      mv.play();
    }

    // Ẩn nút xem AR khi đang hiển thị
    customAR.style.display = "none";

    // Xử lý audio theo AR-JS
    const tryPlayAudio = () => {
      if (!bgm.src) return Promise.resolve();
      bgm.muted = false;
      bgm.volume = 1.0;
      if (!isAudioLoaded) {
        bgm.load();
      }
      return bgm.play();
    };

    const onAfterAudioResolved = () => {
      // Bỏ fade
      requestAnimationFrame(() => {
        fadeCover.style.opacity = "0";
        setTimeout(() => {
          if (fadeCover && fadeCover.parentNode)
            fadeCover.parentNode.removeChild(fadeCover);
          fadeCover = null;
        }, 600);
      });
    };

    // iOS cần tương tác để phát audio. Ta thử phát, nếu fail thì hiện overlay nhắc chạm.
    tryPlayAudio()
      .then(onAfterAudioResolved)
      .catch(() => {
        iosTap = document.createElement("div");
        iosTap.id = "iosTap";
        iosTap.textContent = "👆 Nhấn để bắt đầu";
        iosTap.style.cssText = `
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); color:#fff; display:flex; align-items:center; justify-content:center; font-size: 1.3rem; z-index:1003; font-family: sans-serif; transition: opacity .6s ease;
        `;
        document.body.appendChild(iosTap);
        iosTap.addEventListener("click", () => {
          bgm.muted = false;
          bgm.volume = 1.0;
          bgm
            .play()
            .then(() => {
              iosTap.style.opacity = "0";
              setTimeout(() => {
                if (iosTap && iosTap.parentNode)
                  iosTap.parentNode.removeChild(iosTap);
                iosTap = null;
                onAfterAudioResolved();
              }, 300);
            })
            .catch(() => {
              // vẫn bỏ fade để tiếp tục trải nghiệm không âm thanh
              onAfterAudioResolved();
            });
        });
        // Bỏ lớp fade sớm nếu overlay đã hiện
        onAfterAudioResolved();
      });

    // Nút đóng
    closeBtn = document.createElement("button");
    closeBtn.textContent = "Đóng";
    closeBtn.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1004; background:#FF6B6B; color:#fff; border:none; padding:12px 20px; border-radius:24px; font-weight:600; cursor:pointer;
    `;
    closeBtn.addEventListener("click", cleanup);
    document.body.appendChild(closeBtn);
  } catch (err) {
    console.error("Lỗi khi mở AR:", err);
    // Thông báo lỗi đã được xử lý trong requestCameraAccess
    // Reset processing flag on error
    isARButtonProcessing = false;
  }
});

// Track explore button click (Khám phá thêm) with debouncing
let isExploreButtonProcessing = false;

visitBtn.addEventListener("click", () => {
  // Prevent multiple rapid clicks
  if (isExploreButtonProcessing) {
    console.log("Explore button click already processing, please wait...");
    return;
  }
  
  isExploreButtonProcessing = true;
  
  const currentMonth = getCurrentMonth();
  trackAccess("explore", currentMonth);
  window.open("https://pregnavie.vn", "_blank");
  
  // Reset flag after a short delay to allow tracking cooldown
  setTimeout(() => {
    isExploreButtonProcessing = false;
  }, 1000);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    bgm.pause();
    bgm.currentTime = 0;
  }
});

window.addEventListener("pagehide", () => {
  bgm.pause();
  bgm.currentTime = 0;
});

mv.addEventListener("load", () => {
  const animations = mv.availableAnimations;
  isModelLoaded = true;

  mv.style.opacity = "1";
  mv.classList.add("loaded");

  if (animations && animations.length > 0) {
    firstAnim = animations[0];
    mv.animationName = firstAnim;
    mv.animationLoop = true;
    mv.pause();
  } else {
    console.log("Không tìm thấy animation trong mô hình.");
  }

  mv.addEventListener("ar-status", (event) => {
    console.log("AR status:", event.detail.status);
    if (event.detail.status === "session-started") {
      // Start animation automatically when AR session starts
      if (firstAnim) {
        mv.animationName = firstAnim;
        mv.animationLoop = true;
        mv.currentTime = 0;
        mv.play();
      }

      bgm.pause();
      bgm.currentTime = 0;
      bgm.loop = true; // Enable audio looping in AR mode
      // Load audio if not already loaded
      if (!isAudioLoaded) {
        bgm.load();
        bgm.addEventListener(
          "canplaythrough",
          () => {
            bgm
              .play()
              .catch((err) => console.error("Không phát được nhạc:", err));
          },
          { once: true }
        );
      } else {
        setTimeout(() => {
          bgm
            .play()
            .catch((err) => console.error("Không phát được nhạc:", err));
        }, 100);
      }
    } else if (event.detail.status === "not-presenting") {
      // Pause audio when exiting AR
      bgm.pause();
      bgm.currentTime = 0;
      bgm.loop = false; // Disable audio looping when exiting AR
      mv.cameraOrbit = "45deg 90deg 2m";
      showVisitButton();
    }
  });

  if (mv.getAttribute("ar-status") !== "session-started") {
    mv.setAttribute("ar-status", "not-presenting");
  }

  // Add skeleton loading to buttons initially
  btnGroup.classList.add("loading");

  // Remove skeleton loading and show buttons
  setTimeout(() => {
    btnGroup.classList.remove("loading");
    btnGroup.classList.add("show");
  }, 500);
});

function showVisitButton() {
  if (!visitBtn.classList.contains("show")) {
    visitBtn.style.display = "flex";
    visitBtn.classList.add("show");
    updateBannerText();
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && arActivated) {
    setTimeout(() => {
      if (mv.getAttribute("ar-status") === "not-presenting") {
        showVisitButton();
      }
    }, 500);
  }
});
