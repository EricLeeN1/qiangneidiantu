window.onload = () => {
  const canvas = document.getElementById("iegmCanvas");
  const ctx = canvas.getContext("2d");
  const infoDiv = document.getElementById("info");
  const clickInfoDiv = document.getElementById("click-info");
  const selectBox = document.getElementById("selectBox");
  const popup = document.getElementById("popup");
  const clearBtn = document.getElementById("clearBtn");

  const speed = 2; // 波形的移动速度
  const padding = 50; // 画布边距
  const totalTime = 1000; // 总时间（ms）
  const initHeight = 602; // canvas初始化高度（px）
  const timeScale = (canvas.width - 2 * padding) / totalTime; // 时间缩放比例

  let channelCount = 5; // 要绘制的腔内电图数量
  let channelSpacings = new Array(channelCount).fill(1); // 每个通道的间距比例
  let channelSpacing = (canvas.height - 2 * padding) / channelCount; // 每个腔内电图之间的垂直间距
  let offset = 0; // 波形偏移量
  let iegmData = []; // 存储每个腔内电图的数据
  let iegmNames = []; // 存储每个腔内电图的名称
  let isDraggingChannel = false; // 是否正在拖拽调整通道间距
  let draggedChannelIndex = -1; // 当前拖拽的通道索引
  let verticalLines = []; // 存储竖线的位置
  let isFirstLine = true; // 标记当前是第一条还是第二条竖线
  let initialMouseY = 0; // 拖拽起始Y坐标
  let initialSpacing = 0; // 拖拽起始间距

  let lastClick = { channel: null, time: null };
  // 生成随机噪声，用于模拟腔内电图的不规则性
  const generateNoise = (scale) => {
    return (Math.random() * 2 - 1) * scale;
  };

  // 初始化数据
  const initDatas = () => {
    for (let i = 0; i < channelCount; i++) {
      for (let t = 0; t < totalTime; t++) {
        // 基础波形（正弦波）
        const baseY = Math.sin(((t + offset) * Math.PI) / 40) * 20;
        // 添加随机噪声
        const noise = generateNoise(5);
        const y = baseY + noise;
        // 存储当前点的数据
        iegmData[i][t] = y;
      }
    }
    offset += speed;
  };

  // 绘制X轴（时间轴）
  const drawXAxis = () => {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding); // X轴起点
    ctx.lineTo(canvas.width - padding, canvas.height - padding); // X轴终点
    ctx.stroke();

    // 添加时间刻度
    const timeInterval = 100; // 时间间隔
    for (let t = 0; t <= totalTime; t += timeInterval) {
      const x = padding + t * timeScale;
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - padding);
      ctx.lineTo(x, canvas.height - padding + 5);
      ctx.stroke();

      // 显示时间刻度值
      ctx.fillText(`${t}ms`, x - 10, canvas.height - padding + 20);
    }
  };

  // 绘制Y轴（因素名称）
  const drawYAxis = () => {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding); // Y轴起点
    ctx.lineTo(padding, canvas.height - padding); // Y轴终点
    ctx.stroke();
    ctx.font = "10px Arial";

    for (let i = 0; i < channelCount; i++) {
      const y = getChannelY(i) + getChannelHeight(i) / 2;
      ctx.fillText(iegmNames[i], 2, y);
    }
  };

  // 获取通道的Y坐标
  const getChannelY = (index) => {
    let y = padding;
    for (let i = 0; i < index; i++) {
      y += getChannelHeight(i) + channelSpacings[i] * 20; // 20 是基础间距
    }
    return y;
  };

  // 获取通道的高度
  const getChannelHeight = () => {
    return channelSpacing - 20; // 固定高度
  };

  // 绘制通道波形
  const drawChannels = () => {
    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;

    for (let i = 0; i < channelCount; i++) {
      // console.log(isDraggingChannel, draggedChannelIndex);

      if (isDraggingChannel && draggedChannelIndex !== -1) { // 正在拖拽时
        if (i === draggedChannelIndex) {
          ctx.strokeStyle = "#f0f000";
        } else {
          ctx.strokeStyle = "#00ff00";
        }
      }
      ctx.beginPath();
      ctx.moveTo(padding, getChannelY(i) + getChannelHeight(i) / 2); // 从左侧中间开始绘制

      for (let t = 0; t < totalTime; t++) {
        const x = padding + t * timeScale;
        const y = iegmData[i][t];
        ctx.lineTo(x, getChannelY(i) + getChannelHeight(i) / 2 + y);
      }

      ctx.stroke();
    }
  };

  // 绘制竖线
  const drawVerticalLines = () => {
    // 绘制竖线
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 1;
    verticalLines.forEach((line) => {
      ctx.beginPath();
      ctx.moveTo(line, padding);
      ctx.lineTo(line, canvas.height - padding);
      ctx.stroke();
    });

    // 如果存在两条竖线，绘制带箭头的横线并显示差异
    if (verticalLines.length === 2) {
      const x1 = verticalLines[0];
      const x2 = verticalLines[1];
      const index = iegmNames.findIndex((name) => name === lastClick.channel);
      const y = getChannelY(index) + getChannelHeight(index) / 2;

      const midX = (x1 + x2) / 2;

      // 绘制带箭头的横线
      ctx.strokeStyle = '#0000ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // 绘制左箭头
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1 + 10, y - 5);
      ctx.lineTo(x1 + 10, y + 5);
      ctx.closePath();
      ctx.fillStyle = '#0000ff';
      ctx.fill();

      // 绘制右箭头
      ctx.beginPath();
      ctx.moveTo(x2, y);
      ctx.lineTo(x2 - 10, y - 5);
      ctx.lineTo(x2 - 10, y + 5);
      ctx.closePath();
      ctx.fillStyle = '#0000ff';
      ctx.fill();

      // 计算并显示差异
      const t1 = Math.round((x1 - padding) / timeScale);
      const t2 = Math.round((x2 - padding) / timeScale);
      const y1 = Math.sin((t1 + offset) * Math.PI / 40) * 20 + generateNoise(5);
      const y2 = Math.sin((t2 + offset) * Math.PI / 40) * 20 + generateNoise(5);
      const diff = (y2 - y1).toFixed(2);

      ctx.fillStyle = '#0000ff';
      ctx.fillText(`Δ: ${diff}`, midX - 20, y - 10);
    }
  };

  // 绘制Canvas内容
  const drawCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    // ctx.fillStyle = '#0000ff';
    // ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制坐标轴
    drawXAxis();
    drawYAxis();

    // 绘制通道波形
    drawChannels();

    // requestAnimationFrame(drawChannels);

    // 绘制竖线
    drawVerticalLines();
  };


  // 隐藏弹窗
  const hidePopup = () => {
    popup.style.display = 'none';
  }

  const initCloseButton = () => {
    const dom = document.createElement('div'); // 添加dom
    dom.setAttribute('class', 'close-btn');
    dom.innerText = 'X';
    dom.addEventListener('click', () => {
      hidePopup();
    });
    return dom;
  }

  // 显示弹窗
  const showPopup = (content, x, y) => {

    const closeBtn = initCloseButton();

    popup.innerHTML = content;
    popup.style.display = 'block';
    const width = popup.offsetWidth;
    popup.style.left = `${x + width + 10}px`;
    popup.style.top = `${y}px`;
    popup.appendChild(closeBtn);
  }


  // 显示竖线上的数据
  const showData = (mouseX, mouseY) => {
    if (verticalLines.length === 0) return;

    let info = "";

    if (verticalLines.length === 1) {
      const x = verticalLines[0];
      const t = Math.round((x - padding) / timeScale); // 计算时间点

      info += `时间: ${t}ms\n`;
      for (let i = 0; i < channelCount; i++) {
        info += `${iegmNames[i]}: ${iegmData[i][t].toFixed(2)}\n`;
      }
    } else if (verticalLines.length === 2) {
      const x1 = verticalLines[0];
      const x2 = verticalLines[1];
      const t1 = Math.round((x1 - padding) / timeScale);
      const t2 = Math.round((x2 - padding) / timeScale);
      info += `时间范围: ${t1}ms to ${t2}ms\n`;
      for (let i = 0; i < channelCount; i++) {
        const values = iegmData[i].slice(
          t2 + 1 > t1 ? t1 : t2 + 1,
          t2 + 1 > t1 ? t2 + 1 : t1
        );
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(
          2
        );
        info += `${iegmNames[i]}: 平均数 = ${avg}\n`;
      }
    }
    showPopup(info, mouseX, mouseY);

    infoDiv.textContent = info;
  };

  // 获取点击位置对应的通道和时间
  const getClickInfo = (x, y) => {
    const channelIndex = Math.floor((y - 20) / channelSpacing);
    const time = ((x - 50) / (canvas.width - 100)) * totalTime;
    return { channel: iegmNames[channelIndex], time };
  }

  const showClickInfos = (x, y) => {
    const { channel, time } = getClickInfo(x, y);
    // console.log(`点击通道: ${channel}, 时间: ${time}`);



    if (lastClick.channel === channel) {

      let info = "";

      const minTime = Math.min(lastClick.time, time);
      const maxTime = Math.max(lastClick.time, time);

      // console.log(`时间范围是: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);


      const channelIndex = iegmNames.indexOf(channel);
      const channelData = iegmData[channelIndex];
      // console.log(`通道 Index: ${channelIndex}`);


      const startIndex = Math.floor(minTime);
      const endIndex = Math.floor(maxTime);
      // console.log(`通道开始与结束时间取整: ${startIndex} ${endIndex}`);

      const dataSlice = channelData.slice(startIndex, endIndex + 1);
      const maxValue = Math.max(...dataSlice);
      const minValue = Math.min(...dataSlice);

      // console.log(`通道: ${channel}, 时间范围: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
      // console.log(`最大值: ${maxValue}, 最小值: ${minValue}`);

      info += `当前通道: ${channel}, 时间范围: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms\n`;
      info += `最大值: ${maxValue}, 最小值: ${minValue}\n`;

      clickInfoDiv.textContent = info;
    }

    lastClick = { channel, time };
  }

  // 点击事件处理
  canvas.addEventListener("click", (event) => {
    if (isDraggingChannel) {
      return false;
    }
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left; // 点击的X坐标
    const mouseY = event.clientY - rect.top;


    // 检查点击是否在绘图区域内
    if (mouseX < padding || mouseX > canvas.width - padding) return;

    showClickInfos(mouseX, mouseY);

    // 添加或替换竖线
    if (isFirstLine) {
      verticalLines[0] = mouseX;
      isFirstLine = false;
    } else {
      verticalLines[1] = mouseX;
      isFirstLine = true;
    }

    // 如果超过两条竖线，替换第一条
    if (verticalLines.length > 2) {
      verticalLines.shift(); // 移除第一条竖线
    }

    // 重新绘制Canvas
    drawCanvas();

    // 显示数据
    showData(mouseX, mouseY);
  });

  // 长按拖拽调整通道间距
  let longPressTimer;
  canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseY = event.clientY - rect.top; // 点击的Y坐标

    // 检查点击是否在某个通道范围内
    for (let i = 0; i < channelCount; i++) {
      const y = getChannelY(i);
      const height = getChannelHeight(i);
      if (mouseY >= y && mouseY <= y + height) {
        draggedChannelIndex = i;
        initialMouseY = mouseY;
        initialSpacing = channelSpacings[i];
        // 长按时初始化其他通道缩放比例为1
        for (let j = 0; j < channelCount; j++) {
          if (j !== draggedChannelIndex) {
            channelSpacings[j] = 1;
          }
        }
        longPressTimer = setTimeout(() => {
          isDraggingChannel = true;
        }, 500); // 长按500ms后开始拖拽
        break;
      }
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    if (isDraggingChannel && draggedChannelIndex !== -1) {
      const rect = canvas.getBoundingClientRect();
      const mouseY = event.clientY - rect.top; // 拖拽的Y坐标

      // 计算新的通道间距
      const deltaY = Math.abs(mouseY - initialMouseY);
      channelSpacings[draggedChannelIndex] = initialSpacing + deltaY / 50; // 50 是缩放因子

      //   限制间距范围;
      //   channelSpacings[draggedChannelIndex] = Math.max(
      //     2,
      //     Math.min(2, channelSpacings[draggedChannelIndex])
      //   );
      console.log(channelSpacings);

      console.log(deltaY, channelSpacing);
      console.log(canvas.height);
      // 动态调整Canvas高度
      const totalSpacing = channelSpacings.reduce((a, b) => a + b, 0);
      canvasHeight = Math.max(initHeight, padding * 2 + (getChannelHeight()) * channelCount + totalSpacing * 20);
      canvas.height = canvasHeight;
      drawCanvas();
    }
  });

  canvas.addEventListener("mouseup", () => {
    clearTimeout(longPressTimer);
    setTimeout(() => {
      isDraggingChannel = false;
      draggedChannelIndex = -1;
      // canvas.height = initHeight;
      // channelSpacings = new Array(channelCount).fill(1); // 每个通道的间距比例
      // 重新绘制Canvas
      drawCanvas();
    }, 200);
  });

  clearBtn.addEventListener("click", () => {
    canvas.height = initHeight;
    channelSpacings = new Array(channelCount).fill(1); // 每个通道的间距比例
    // 重新绘制Canvas
    drawCanvas();
  });

  const init = () => {
    channelSpacing = (canvas.height - 2 * padding) / channelCount; // 每个腔内电图之间的垂直间距

    channelSpacings = new Array(channelCount).fill(1); // 每个通道的间距比例
    // 初始化数据存储和名称
    iegmNames = []; // 初始化通道名
    iegmData = []; // 初始化数据
    for (let i = 1; i <= channelCount; i++) {
      iegmData.push([]);
      iegmNames.push(`通道${i}`); // 为每个腔内电图生成名称
    }
    initDatas();
    // 初始化Canvas
    drawCanvas();
  };

  selectBox.addEventListener("change", (e) => {
    channelCount = e.target.value - 0;
    init();
  });

  init();

  // 动态更新波形
  // const updateWaveform = () => {
  //   offset += 2;
  //   drawCanvas();
  //   requestAnimationFrame(updateWaveform);
  // };

  // updateWaveform();
};
