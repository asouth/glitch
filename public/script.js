function startNewSession() {
  var deviceId = document.getElementById("deviceId").value;
  
  fetch('/start-logging-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ deviceId: deviceId })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    alert('New logging session started');
    displayLatestLogs(); // Moved this line here.
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

function displayLatestLogs() {
    const selectedDevice = document.getElementById('deviceId').value;

    // Fetch latest logs for the selected device
    fetch(`/log/${selectedDevice}/latest`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Create a table
            const table = document.createElement('table');
            table.className = 'table table-striped';

            // Table header
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            
            ["Date/Time", "LAeq,T", "LA90,T", "LAmax,T"].forEach(headerText => {
                const th = document.createElement('th');
                th.scope = 'col';
                th.textContent = headerText;
                tr.appendChild(th);
            });
            thead.appendChild(tr);
            table.appendChild(thead);

            // Table body
            const tbody = document.createElement('tbody');

            data.forEach(logEntry => {
                const tr = document.createElement('tr');

                // Assuming each log entry has date, laeq, la90, and lamax properties
                [logEntry.date, logEntry.laeq, logEntry.la90, logEntry.lamax].forEach(columnText => {
                    const td = document.createElement('td');
                    td.textContent = columnText;
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            // Clear the logs container and append the new table
            const logsContainer = document.getElementById('logs');
            logsContainer.innerHTML = '';
            logsContainer.appendChild(table);
        })
        .catch(error => {
            console.error('Error fetching latest logs:', error);
        });
}


function formatDateTime(dateTimeString) {
  var date = new Date(dateTimeString);

  var day = String(date.getDate()).padStart(2, '0');
  var month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  var year = date.getFullYear();

  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');
  var seconds = String(date.getSeconds()).padStart(2, '0');
  var milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes + ':' + seconds + '.' + milliseconds;
}