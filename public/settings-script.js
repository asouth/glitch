function updateSettings() {
  const deviceId = document.getElementById("deviceId").value;
  
  // Only redirect if the deviceId has changed
  if (window.location.search !== `?deviceId=${deviceId}`) {
    window.location.href = `/?deviceId=${deviceId}`;
  }
}


