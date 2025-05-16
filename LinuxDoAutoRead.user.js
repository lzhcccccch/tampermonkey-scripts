// ==UserScript==
// @name         LinuxDo Auto Read
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  自动刷linuxdo文章
// @author       lzhcccccch
// @match        https://linux.do/*
// @updateURL    https://raw.githubusercontent.com/lzhcccccch/tampermonkey-scripts/main/LinuxDoAutoRead.user.js
// @downloadURL  https://raw.githubusercontent.com/lzhcccccch/tampermonkey-scripts/main/LinuxDoAutoRead.user.js
// @grant        none
// @icon         https://www.google.com/s2/favicons?domain=linux.do
// ==/UserScript==

(function () {
  "use strict";

  // 只针对 linux.do 网站生效
  const BASE_URL = "https://linux.do";

  // 如果当前网站不是 linux.do，则直接返回
  if (!window.location.href.startsWith(BASE_URL)) {
    return;
  }

  console.log("脚本正在运行在: " + BASE_URL);

  const commentLimit = 1000;
  const topicListLimit = 100;

  // 滚动相关参数
  const scrollSettings = {
    // 滚动步长 (每次滚动的像素数)
    scrollStep: 20,
    // 滚动步长间隔 (毫秒)
    scrollStepInterval: 50,
    // 底部检测间隔 (毫秒)
    bottomCheckInterval: 1000,
    // 到达底部后的等待时间 (毫秒)
    bottomWaitTime: 3000,
    // 底部缓冲区 (像素) - 更大的值确保不会错过内容
    bottomBuffer: 50,
    // 每滚动一屏后暂停的时间 (毫秒)
    pauseAfterScreen: 800,
    // 连续检测到底部的次数阈值，确保真的到底部了
    bottomDetectionThreshold: 5
  };

  // 检查是否是第一次运行脚本
  function checkFirstRun() {
    if (localStorage.getItem("isFirstRun") === null) {
      console.log("脚本第一次运行，执行初始化操作...");
      updateInitialData();
      localStorage.setItem("isFirstRun", "false");
    } else {
      console.log("脚本非第一次运行");
    }
  }

  // 更新初始数据的函数
  function updateInitialData() {
    localStorage.setItem("read", "false"); // 开始时自动滚动关闭
    localStorage.setItem("readingSpeed", "medium"); // 默认设置为中速
    console.log("执行了初始数据更新操作");
  }

  let scrollInterval = null;
  let bottomCheckInterval = null;
  let lastScrollPosition = 0;
  let pauseScrolling = false;
  let bottomDetectionCount = 0;
  let isNavigating = false;

  // 获取页面总高度
  function getDocumentHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
  }

  // 检查是否已到达页面底部
  function isAtBottom() {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = getDocumentHeight();
    const isBottom = scrollPosition >= documentHeight - scrollSettings.bottomBuffer;

    if (isBottom) {
      console.log(`检测到底部: 滚动位置=${scrollPosition}, 文档高度=${documentHeight}`);
    }

    return isBottom;
  }

  // 平滑滚动函数 - 负责实际的滚动操作
  function scrollToBottomSlowly() {
    if (scrollInterval !== null) {
      clearInterval(scrollInterval);
    }

    scrollInterval = setInterval(() => {
      // 如果暂停滚动或正在导航，则跳过
      if (pauseScrolling || isNavigating) return;

      // 获取当前滚动位置
      const currentPosition = window.scrollY;
      const viewportHeight = window.innerHeight;

      // 平滑滚动
      window.scrollBy(0, scrollSettings.scrollStep);

      // 检测是否滚动了一屏
      if (currentPosition - lastScrollPosition >= viewportHeight) {
        lastScrollPosition = currentPosition;

        // 暂停滚动一段时间，让用户阅读
        pauseScrolling = true;
        setTimeout(() => {
          pauseScrolling = false;
        }, scrollSettings.pauseAfterScreen);
      }
    }, scrollSettings.scrollStepInterval);
  }

  // 专门用于检测底部的函数 - 与滚动分离
  function startBottomDetection() {
    if (bottomCheckInterval !== null) {
      clearInterval(bottomCheckInterval);
    }

    bottomDetectionCount = 0;

    bottomCheckInterval = setInterval(() => {
      // 如果不在阅读状态或正在导航，则停止检测
      if (localStorage.getItem("read") !== "true" || isNavigating) {
        clearInterval(bottomCheckInterval);
        bottomCheckInterval = null;
        return;
      }

      // 检查是否到达底部
      if (isAtBottom()) {
        bottomDetectionCount++;
        console.log(`底部检测计数: ${bottomDetectionCount}/${scrollSettings.bottomDetectionThreshold}`);

        // 连续多次检测到底部，确认真的到达底部
        if (bottomDetectionCount >= scrollSettings.bottomDetectionThreshold) {
          console.log("确认已到达页面底部，准备跳转");

          // 停止滚动和检测
          stopScrolling();

          // 设置导航标志，防止重复触发
          if (!isNavigating) {
            isNavigating = true;

            // 显示到达底部提示
            showBottomNotification();

            // 等待一段时间后跳转，给用户查看底部内容的时间
            setTimeout(() => {
              if (localStorage.getItem("read") === "true") {
                openNewTopic();
              } else {
                isNavigating = false;
              }
            }, scrollSettings.bottomWaitTime);
          }
        }
      } else {
        // 如果没有检测到底部，重置计数
        if (bottomDetectionCount > 0) {
          console.log("未检测到底部，重置计数");
          bottomDetectionCount = 0;
        }
      }
    }, scrollSettings.bottomCheckInterval);
  }

  // 显示已到达底部的通知
  function showBottomNotification() {
    const notification = document.createElement("div");
    notification.textContent = "已到达页面底部，即将跳转...";
    notification.style.position = "fixed";
    notification.style.bottom = "80px";
    notification.style.left = "50%";
    notification.style.transform = "translateX(-50%)";
    notification.style.backgroundColor = "#333";
    notification.style.color = "#fff";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "5px";
    notification.style.zIndex = "10000";
    notification.style.opacity = "0";
    notification.style.transition = "opacity 0.5s";

    document.body.appendChild(notification);

    // 淡入效果
    setTimeout(() => {
      notification.style.opacity = "1";
    }, 10);

    // 自动移除
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, scrollSettings.bottomWaitTime - 500);
  }

  // 强制滚动到底部 - 用于确保完全到底部
  function forceScrollToBottom() {
    const documentHeight = getDocumentHeight();
    window.scrollTo(0, documentHeight);
    console.log("强制滚动到底部");
  }

  function getLatestTopic() {
    let latestPage = Number(localStorage.getItem("latestPage")) || 0;
    let topicList = [];
    let isDataSufficient = false;

    while (!isDataSufficient) {
      latestPage++;
      const url = `${BASE_URL}/latest.json?no_definitions=true&page=${latestPage}`;

      $.ajax({
        url: url,
        async: false,
        success: function (result) {
          if (
            result &&
            result.topic_list &&
            result.topic_list.topics.length > 0
          ) {
            result.topic_list.topics.forEach((topic) => {
              // 未读且评论数小于 commentLimit
              if (commentLimit > topic.posts_count) {
                topicList.push(topic);
              }
            });

            // 检查是否已获得足够的 topics
            if (topicList.length >= topicListLimit) {
              isDataSufficient = true;
            }
          } else {
            isDataSufficient = true; // 没有更多内容时停止请求
          }
        },
        error: function (XMLHttpRequest, textStatus, errorThrown) {
          console.error(XMLHttpRequest, textStatus, errorThrown);
          isDataSufficient = true; // 遇到错误时也停止请求
        },
      });
    }

    if (topicList.length > topicListLimit) {
      topicList = topicList.slice(0, topicListLimit);
    }

    localStorage.setItem("topicList", JSON.stringify(topicList));
  }

  function openNewTopic() {
    let topicListStr = localStorage.getItem("topicList");
    let topicList = topicListStr ? JSON.parse(topicListStr) : [];

    // 如果列表为空，则获取最新文章
    if (topicList.length === 0) {
      getLatestTopic();
      topicListStr = localStorage.getItem("topicList");
      topicList = topicListStr ? JSON.parse(topicListStr) : [];
    }

    // 如果获取到新文章，打开第一个
    if (topicList.length > 0) {
      const topic = topicList.shift();
      localStorage.setItem("topicList", JSON.stringify(topicList));
      console.log(`跳转到新话题: ${topic.id}`);

      if (topic.last_read_post_number) {
        window.location.href = `${BASE_URL}/t/topic/${topic.id}/${topic.last_read_post_number}`;
      } else {
        window.location.href = `${BASE_URL}/t/topic/${topic.id}`;
      }
    } else {
      // 没有更多文章可读，重置阅读状态
      localStorage.setItem("read", "false");
      updateReadButton();
      stopScrolling();
      isNavigating = false;
      alert("已浏览完所有话题！");
    }
  }

  // 停止所有滚动相关的计时器
  function stopScrolling() {
    if (scrollInterval !== null) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    if (bottomCheckInterval !== null) {
      clearInterval(bottomCheckInterval);
      bottomCheckInterval = null;
    }
    pauseScrolling = false;
    bottomDetectionCount = 0;
  }

  // 开始阅读流程
  function startReading() {
    // 重置状态
    stopScrolling();
    isNavigating = false;

    // 记录当前滚动位置
    lastScrollPosition = window.scrollY;

    // 开始滚动和底部检测
    scrollToBottomSlowly();
    startBottomDetection();

    console.log("开始阅读流程");
  }

  // 更新阅读按钮的文本和样式
  function updateReadButton() {
    const readButton = document.getElementById("auto-read-button");
    if (readButton) {
      const isReading = localStorage.getItem("read") === "true";
      readButton.textContent = isReading ? "停止阅读" : "开始阅读";

      // 根据状态更新按钮样式
      if (isReading) {
        readButton.style.backgroundColor = "#ff6b6b"; // 红色背景表示停止
        readButton.style.color = "#ffffff"; // 白色文字
      } else {
        readButton.style.backgroundColor = "#4CAF50"; // 绿色背景表示开始
        readButton.style.color = "#ffffff"; // 白色文字
      }
    }
  }

  // 入口函数
  window.addEventListener("load", () => {
    checkFirstRun();
    console.log("autoRead", localStorage.getItem("read"));

    // 创建控制面板
    createControlPanel();

    // 检查是否需要开始阅读
    if (localStorage.getItem("read") === "true") {
      console.log("执行正常的滚动和检查逻辑");
      // 短暂延迟，确保页面完全加载
      setTimeout(() => {
        startReading();
      }, 1000);
    }

    // 添加页面变化监听 - 处理动态加载内容的情况
    const observer = new MutationObserver((mutations) => {
      // 如果正在阅读且检测到页面内容变化，重新启动底部检测
      if (localStorage.getItem("read") === "true" && !isNavigating && bottomCheckInterval === null) {
        console.log("检测到页面内容变化，重新启动底部检测");
        startBottomDetection();
      }
    });

    // 观察整个文档的变化
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  // 创建控制面板 - 包含所有按钮的垂直排列
  function createControlPanel() {
    const controlPanel = document.createElement("div");
    controlPanel.id = "control-panel";
    controlPanel.style.position = "fixed";
    controlPanel.style.bottom = "20px";
    controlPanel.style.left = "20px"; // 修改: 从右下角改为左下角
    controlPanel.style.zIndex = "9999";
    controlPanel.style.display = "flex";
    controlPanel.style.flexDirection = "column";
    controlPanel.style.gap = "10px";
    controlPanel.style.alignItems = "center";

    // 创建速度按钮
    const slowButton = createSpeedButton("慢速", "#3498db", () => {
      scrollSettings.scrollStep = 10;
      scrollSettings.scrollStepInterval = 80;
      scrollSettings.pauseAfterScreen = 1500;
      scrollSettings.bottomDetectionThreshold = 7;

      if (localStorage.getItem("read") === "true") {
        stopScrolling();
        startReading();
      }

      highlightActiveSpeedButton("slow");
    });
    slowButton.id = "speed-slow";

    const mediumButton = createSpeedButton("中速", "#2ecc71", () => {
      scrollSettings.scrollStep = 20;
      scrollSettings.scrollStepInterval = 50;
      scrollSettings.pauseAfterScreen = 800;
      scrollSettings.bottomDetectionThreshold = 5;

      if (localStorage.getItem("read") === "true") {
        stopScrolling();
        startReading();
      }

      highlightActiveSpeedButton("medium");
    });
    mediumButton.id = "speed-medium";

    const fastButton = createSpeedButton("快速", "#e74c3c", () => {
      scrollSettings.scrollStep = 30;
      scrollSettings.scrollStepInterval = 30;
      scrollSettings.pauseAfterScreen = 300;
      scrollSettings.bottomDetectionThreshold = 3;

      if (localStorage.getItem("read") === "true") {
        stopScrolling();
        startReading();
      }

      highlightActiveSpeedButton("fast");
    });
    fastButton.id = "speed-fast";

    // 创建跳过按钮
    const skipButton = document.createElement("button");
    skipButton.id = "skip-button";
    skipButton.textContent = "跳过当前文章";
    skipButton.style.padding = "8px 12px"; // 修改: 调整padding与其他按钮一致
    skipButton.style.width = "120px"; // 修改: 缩小按钮宽度
    skipButton.style.borderRadius = "20px"; // 修改: 调整为与其他按钮一致的圆角
    skipButton.style.border = "none";
    skipButton.style.backgroundColor = "#f39c12";
    skipButton.style.color = "#ffffff";
    skipButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    skipButton.style.cursor = "pointer";
    skipButton.style.fontWeight = "bold";
    skipButton.style.transition = "all 0.3s ease";
    skipButton.style.textAlign = "center";
    skipButton.style.fontSize = "12px"; // 修改: 调整字体大小与其他按钮一致

    skipButton.onmouseover = function() {
      this.style.opacity = "0.9";
      this.style.transform = "scale(1.05)";
    };

    skipButton.onmouseout = function() {
      this.style.opacity = "1";
      this.style.transform = "scale(1)";
    };

    skipButton.onclick = function() {
      if (localStorage.getItem("read") === "true" && !isNavigating) {
        forceScrollToBottom();
        isNavigating = true;

        const notification = document.createElement("div");
        notification.textContent = "手动跳转到下一篇...";
        notification.style.position = "fixed";
        notification.style.top = "50%";
        notification.style.left = "50%";
        notification.style.transform = "translate(-50%, -50%)";
        notification.style.backgroundColor = "#333";
        notification.style.color = "#fff";
        notification.style.padding = "20px";
        notification.style.borderRadius = "5px";
        notification.style.zIndex = "10000";
        document.body.appendChild(notification);

        setTimeout(() => {
          openNewTopic();
        }, 1000);
      }
    };

    // 创建阅读按钮
    const readButton = document.createElement("button");
    readButton.id = "auto-read-button";
    readButton.style.padding = "8px 12px"; // 修改: 调整padding与其他按钮一致
    readButton.style.width = "120px"; // 修改: 缩小按钮宽度
    readButton.style.borderRadius = "20px"; // 修改: 调整为与其他按钮一致的圆角
    readButton.style.border = "none";
    readButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    readButton.style.cursor = "pointer";
    readButton.style.fontFamily = "Arial, sans-serif";
    readButton.style.fontSize = "12px"; // 修改: 调整字体大小与其他按钮一致
    readButton.style.fontWeight = "bold";
    readButton.style.transition = "all 0.3s ease";
    readButton.style.textAlign = "center";

    const isReading = localStorage.getItem("read") === "true";
    readButton.textContent = isReading ? "停止阅读" : "开始阅读";

    if (isReading) {
      readButton.style.backgroundColor = "#ff6b6b";
      readButton.style.color = "#ffffff";
    } else {
      readButton.style.backgroundColor = "#4CAF50";
      readButton.style.color = "#ffffff";
    }

    readButton.onmouseover = function() {
      this.style.opacity = "0.9";
      this.style.transform = "scale(1.05)";
    };

    readButton.onmouseout = function() {
      this.style.opacity = "1";
      this.style.transform = "scale(1)";
    };

    readButton.onclick = function() {
      const currentlyReading = localStorage.getItem("read") === "true";
      const newReadState = !currentlyReading;
      localStorage.setItem("read", newReadState.toString());

      updateReadButton();

      if (!newReadState) {
        stopScrolling();
        isNavigating = false;
        localStorage.removeItem("navigatingToNextTopic");
      } else {
        startReading();
      }
    };

    // 按照从上到下的顺序添加按钮：慢速、中速、快速、跳过当前文章、开始阅读
    controlPanel.appendChild(slowButton);
    controlPanel.appendChild(mediumButton);
    controlPanel.appendChild(fastButton);
    controlPanel.appendChild(skipButton);
    controlPanel.appendChild(readButton);

    document.body.appendChild(controlPanel);

    // 获取上次使用的速度设置
    const lastSpeed = localStorage.getItem("readingSpeed") || "medium";

    // 根据上次使用的速度设置应用相应的参数
    switch (lastSpeed) {
      case "slow":
        scrollSettings.scrollStep = 10;
        scrollSettings.scrollStepInterval = 80;
        scrollSettings.pauseAfterScreen = 1500;
        scrollSettings.bottomDetectionThreshold = 7;
        break;
      case "medium":
        scrollSettings.scrollStep = 20;
        scrollSettings.scrollStepInterval = 50;
        scrollSettings.pauseAfterScreen = 800;
        scrollSettings.bottomDetectionThreshold = 5;
        break;
      case "fast":
        scrollSettings.scrollStep = 30;
        scrollSettings.scrollStepInterval = 30;
        scrollSettings.pauseAfterScreen = 300;
        scrollSettings.bottomDetectionThreshold = 3;
        break;
      default:
        scrollSettings.scrollStep = 20;
        scrollSettings.scrollStepInterval = 50;
        scrollSettings.pauseAfterScreen = 800;
        scrollSettings.bottomDetectionThreshold = 5;
        localStorage.setItem("readingSpeed", "medium");
    }

    // 高亮显示当前选中的速度按钮
    highlightActiveSpeedButton(lastSpeed);
  }

  // 创建速度按钮的辅助函数
  function createSpeedButton(text, color, onClick) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.padding = "8px 12px";
    button.style.width = "120px"; // 修改: 缩小按钮宽度
    button.style.borderRadius = "20px";
    button.style.border = "none";
    button.style.backgroundColor = color;
    button.style.color = "#ffffff";
    button.style.cursor = "pointer";
    button.style.fontFamily = "Arial, sans-serif";
    button.style.fontSize = "12px";
    button.style.fontWeight = "bold";
    button.style.opacity = "0.7";
    button.style.transition = "all 0.3s ease";
    button.style.textAlign = "center";

    // 添加鼠标悬停效果
    button.onmouseover = function() {
      if (!this.classList.contains("active")) {
        this.style.opacity = "0.9";
      }
    };

    button.onmouseout = function() {
      if (!this.classList.contains("active")) {
        this.style.opacity = "0.7";
      }
    };

    button.onclick = onClick;

    return button;
  }

  // 高亮当前选中的速度按钮
  function highlightActiveSpeedButton(speed) {
    // 重置所有按钮样式
    const buttons = ["slow", "medium", "fast"];
    buttons.forEach(btn => {
      const button = document.getElementById(`speed-${btn}`);
      if (button) {
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.classList.remove("active");
      }
    });

    // 高亮选中的按钮
    const activeButton = document.getElementById(`speed-${speed}`);
    if (activeButton) {
      activeButton.style.opacity = "1";
      activeButton.style.transform = "scale(1.1)";
      activeButton.classList.add("active");
    }

    // 保存当前速度设置
    localStorage.setItem("readingSpeed", speed);
  }
})();
