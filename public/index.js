// things to add 
// (do this one since there is a lot of spaghetti)renaming and polishing the code (for css too)
// pwt hot key for opening its menu
// complete reply 
// add notification and add toggle for it 
// complete the left menu (add main chat, archives and games)
// allow sending multiple files
// add deleting messages
// add command and right click options depending on user role 
// add search
// add who is online or offline with good UI
// add customiztation
// add command for hiding messsages i.e /hide 50 or /hide from 10{message id} to 90 
// add custom background image 
// add exam mode 
// add poll or voting system
// make the main input a div and then add an input tag inside it to make it more flexible (also can fix reply with this )
// complete divider
// fix user status with "heartbeat"(occationaly pinging client)

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)   return parts.pop().split(';').shift();
  return null;
}
const authToken = getCookie("auth_token")

// check for cookie and authorization
document.addEventListener('DOMContentLoaded', function() {
  if (!authToken) window.location.href = '../login/login.html'
  if (!localStorage.getItem('authorized')) window.location.href = '/Authorize/'
  applyFilters()
  loadMessages()
})

let autoScrollEnabled = true;
let socket = io()
let replyId
const body             = document.body
const form             = document.getElementById('form')
const input            = document.getElementById('input')
const fileInput        = document.getElementById('file')
const messages         = document.getElementById("messages")
const menu             = document.getElementById("menu")
const messageContainer = document.getElementById("messages")
const chatContainer    = document.getElementById("chat")

socket.on('chat message', (message) => {
  messages.innerHTML += messageTemplate(message);
  
  let notify = document.getElementById("notify");
  if (notify) {
    clearTimeout(notifyTimeout); 
    notify.remove();
  }

  notify = createCustomElement("div", { id: "notify" });
  messages.appendChild(notify);

  notifyTimeout = setTimeout(() => notify.remove(), 1000);

  scrollToBottom(true);
});

// divider not complete 
const divider = document.getElementById("divider")
divider.addEventListener("mousedown",()=>{
  divider.addEventListener("mousemove",()=>{

  })
})
//end divider

function previewFile() {
  let preview = document.querySelector('img')
  let file    = document.querySelector('input[type=file]').files[0]
  let reader  = new FileReader()
  reader.onloadend = function () {  preview.src = reader.result}
  if (file) reader.readAsDataURL(file);
  else preview.src = "";
}

// auto scroll down and scroll down button
messages.addEventListener('scroll', () => {
  if (messages.scrollTop < messages.scrollHeight-1000 ) {
    document.getElementById("scroll-down").style.display = `block`
    setTimeout(() => { document.getElementById("scroll-down").style.opacity = `1` }, 200)
  }
  else if (messages.scrollTop > messages.scrollHeight-1000 ){
    document.getElementById("scroll-down").style.opacity = `0`
    setTimeout(() => { document.getElementById("scroll-down").style.display = `none` }, 200)
  }
  if (messages.scrollTop == 0) setTimeout (()=> loadOlderMessages() , 100) 
})

function scrollToBottom(transition = true) {
  // Only scroll if auto-scroll is enabled and we're near the bottom
  if (autoScrollEnabled || messages.scrollHeight - 50 <= messages.scrollTop + messages.offsetHeight) {
    messages.scrollTo({
      top: messages.scrollHeight,
      behavior: transition ? "smooth" : "instant"
    });
  }
}

// sending message
form.addEventListener('submit', function(e) {
  e.preventDefault();
  sendMessage(input.value,replyId)
})

function loadMessages() {
  fetch('/get-messages')
    .then(response => response.json())
    .then(data => {
      data.forEach(message => {
        messages.innerHTML += messageTemplate(message)
      });
      setTimeout(() => scrollToBottom(false) , 100)
    })
    .catch(error => console.error('Error fetching messages:', error));
}

// Updated message template function
function messageTemplate(message) {
  // Set up the reply section if the message is a reply
  let replySection = '';
  let file = '';
  if (message.replyId && message.repliedMessage && message.repliedUsername) {
    replySection = `
    <div class="replied-message-container" data-reply-id="${message.replyId}" onclick="scrollToMessage(${message.replyId})">
      <div class="replied-username">${message.repliedUsername}</div>
      <div class="replied-text"><p>${message.repliedMessage}</p></div>
    </div>`;
  }

  // Set up file attachments
  if (message.filePath) {
    const fileExt = message.filePath.split('.').pop().toLowerCase();
    if (['jpeg', 'jpg', 'png'].includes(fileExt)) file = `<img src="uploads/${message.filePath}" class="sent image">`;
    else if (['mp4', 'avi'].includes(fileExt)) file = `<video controls src="uploads/${message.filePath}" class="sent video"></video>`;
    else if (fileExt === 'pdf') file = `<object data="uploads/${message.filePath}" class="sent pdf" width="800px" height="600px"></object>`;
    else file = `<a href="uploads/${message.filePath}">free robux</a>`;
  }

  // Main message template with `ondblclick` to trigger reply
  return `
    <div class="message" ondblclick="replyToMessage(${message.messageId})"> <!-- Double-click to reply -->
      <div class="message-container">
        <div class="message-profile">
          <img src="uploads/${message.profileImage}" alt="NPC" class="user-profile">
        </div>
        <div class="message-content">
          <div class="username" data-user-id="${message.userId}">${message.username}</div>
          ${replySection}
          ${file}
          <div class="message-text" data-message-id="${message.messageId}">
            <p>${message.message}</p>
          </div>
          <div class="message-detail"></div>
        </div>
      </div>
    </div>`;
}

function scrollToMessage(replyId) {
  const targetMessage = document.querySelector(`.message-text[data-message-id="${replyId}"]`)
  if (targetMessage) {
    targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const messageContainer = targetMessage.closest('.message').querySelector('.message-container');
    messageContainer.classList.add('highlight');
    
    setTimeout(() => {  messageContainer.classList.remove('highlight') } , 1000)
  }
}

function sendMessage(userMessage, replyId = null) {
  const message = userMessage.trim();
  const hasFile = fileInput && fileInput.files.length > 0
  if (message === '') return; // return if message is empty

  const fetchOptions = {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authToken}` }
  };

  if (hasFile) {
    // Add data to FormData when a file is present
    const formData = new FormData();
    formData.append('message', message);
    formData.append('replyId', replyId);
    formData.append('file', fileInput.files[0]);
    fetchOptions.body = formData;
  } else {
    // Add JSON data when no file is present
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify({ message, replyId });
  }

  fetch('/submit-message', fetchOptions)
    .then(response => {
      if (!response.ok) throw new Error('Failed to submit message');
      scrollToBottom(true)
      return response.json();
    })
    .then(data => {
      input.value = ''  
      if (hasFile) fileInput.value = '' 
      if (document.getElementById("reply-container")) removeReply() 
    })
    .catch(error => console.error('Error submitting message:', error));
}

// end message func
// black screen

const blackScreen = document.getElementById("black-screen")
const moreButton = document.getElementById("more")
const moreMenu = document.getElementById("more-menu")
let moreMenuToggle = false

// START creating menu 
function toggleBlackScreen(content = '',element) {
  element.style.display = content ? 'block' : 'none';
  element.innerHTML = content;
}

function addCloseButton(parent,removableElement) {
  const button = document.createElement("button");
  button.id = "close-black-screen";
  button.innerHTML = '<svg fill="#000000" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460.775 460.775"><g > <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/> </g></svg>'
  button.addEventListener("click", () => toggleBlackScreen('',removableElement));
  parent.appendChild(button);
}

function createMenu(content){
  mainContent = `<div class="menu">${content}</div>`
  toggleBlackScreen(mainContent,blackScreen)
  addCloseButton(document.getElementById("menu-toolbar"),blackScreen)
  document.addEventListener('keydown',(event)=>{
    if (event.key === "Escape") toggleBlackScreen('',blackScreen)
  })
}

// END creating menu 

// Fetch and display user details
document.addEventListener("click", async (event) => {
  if (event.target.classList.contains('username')) {
    const userId = event.target.getAttribute('data-user-id');
    try {
      const response = await fetch(`/users-details?id=${encodeURIComponent(userId)}`)
      if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`)
      const user = await response.json()   
      createMenu(`
      <div id="menu-toolbar">User Info</div>
        <div class="user-info-container">
          <img class="user-image" src="/uploads/${user.profile_image}" alt="">
          <div style="width: 100%;">
            <p class="user-detail">${user.username}</p>
            <p class="user-detail">User ID: ${user.id}</p>
            <p class="user-detail">User Role: ${user.role}</p>
            <p class="user-detail">User Status: ${user.status}</p>
          </div>
        </div>`)
    } catch (error) {
      console.error('Error fetching user details:', error)
    }
  }
});

// Toggle Off functionality
let toggleOff = false
function toggleOffSetup() {
  document.getElementById("off").style.display   = toggleOff ? "none" : "block"
  body.style.cursor                     = toggleOff ? "default" : "none"
  toggleOff = !toggleOff
}
document.getElementById("turn-off").addEventListener("click", ()=> toggleOffSetup() )
// keys 
const keyState = {
  altPressed      : false,
  enterPressed    : false,
  dotPressed      : false,
  backtickPressed : false
}
document.addEventListener("keydown", (event) => {
  const { key, keyCode } = event

  keyState.altPressed      ||= keyCode === 18
  keyState.enterPressed    ||= keyCode === 13
  keyState.backtickPressed ||= key === "`"
  keyState.dotPressed      ||= key === "."
  if (key === "/" && document.activeElement !== input) {
    event.preventDefault()
    input.focus()
  }
  // turn off screen when alt + (x || .) is pressed or when enter + . is pressed 
  if ((keyState.altPressed && (keyCode === 190 || keyCode === 88)) || (keyState.enterPressed && keyState.dotPressed))  toggleOffSetup()

  if (localStorage.getItem("examMode") === "true"){
    let brightness = parseInt(localStorage.getItem("brightness")) ?? 50
    const grayScale = localStorage.getItem("grayScale") === "true" ? 1 : 0

    if (event.key === "=" || event.key === "+")   brightness = Math.min(brightness + 50, 400); // max brightness 400
    else if (event.key === "-" ) brightness = Math.max(brightness - 50, 0); // min brightness 0
    
    localStorage.setItem("brightness", brightness)
    body.style.filter = `grayscale(${grayScale}) brightness(${brightness}%)`.trim()
  }
})

document.addEventListener("keyup", (event) => {
  const { key, keyCode } = event

  if (keyCode === 18) keyState.altPressed   = false
  if (keyCode === 13) keyState.enterPressed = false
  if (key === "`") keyState.backtickPressed = false
  if (key === ".") keyState.dotPressed      = false
});

// More Menu toggle
moreButton.addEventListener("click", () => {
  moreMenu.style.display = moreMenuToggle ? 'none' : 'block';
  moreMenu.style.opacity = moreMenuToggle ? '0' : '1';
  moreMenuToggle = !moreMenuToggle;
  if (!moreMenuToggle) setTimeout(() => { moreMenu.style.display = 'none'; }, 200);
});

// Settings Button Setup
async function settingButtonSetup() {
  const settingButton = document.getElementById("setting-button");
  settingButton.addEventListener("click", async () => {
    try {
      const response = await fetch(`/user-details`, {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error(`Error: ${response.status} ${response.statusText}`);
      const user = await response.json();
      
      createMenu(`          
        <div id="menu-toolbar"> Profile
            <button id="edit-profile-button"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" fill="none"/><path d="M.75,17.5A.751.751,0,0,1,0,16.75V12.569a.755.755,0,0,1,.22-.53L11.461.8a2.72,2.72,0,0,1,3.848,0L16.7,2.191a2.72,2.72,0,0,1,0,3.848L5.462,17.28a.747.747,0,0,1-.531.22ZM1.5,12.879V16h3.12l7.91-7.91L9.41,4.97ZM13.591,7.03l2.051-2.051a1.223,1.223,0,0,0,0-1.727L14.249,1.858a1.222,1.222,0,0,0-1.727,0L10.47,3.91Z"/></svg></button>
        </div>
        <div class="user-info-container">
          <a href="/uploads/${user.profile_image}" id="user-profile-image">
            <img class="user-image" src="/uploads/${user.profile_image}" alt="NPC">
          </a>
          <div id="user-profile-detail">
            <p class="user-detail">${user.username}</p>
            <p class="user-detail">User ID: ${user.id}</p>
            <p class="user-detail">User Role: ${user.role}</p>
          </div>


          <form id="exam-mode-config">
            <input type="checkbox" id="exam-mode" class="checkbox custom-checkbox">
            <label for="exam-mode">exam mode</label>
            <br>
            <br>
            <input type="checkbox" id="exam-mode-gray-scale" class="checkbox custom-checkbox">
            <label for="exam-mode-gray-scale">gray scale</label>
            <br>
            <br>
            <input type="number" min="0" max="100" id="exam-mode-brightness" style = "display:initial;"/>
            <label for="exam-mode-brightness">brightness</label>
          </form>
        </div>`)

      examModeInit()
      const examModeConfig = document.getElementById("exam-mode-config")
      examModeConfig.addEventListener("input", ()=>applyFilters() )

      // START edit profile

      document.getElementById("edit-profile-button").addEventListener("click", () => {
        createMenu(`          
          <form action="/update-profile" method="POST" enctype="multipart/form-data">
            <div id="menu-toolbar">Edit Profile</div>
            <input type="text" name="username" class="new-profile-input" placeholder="Enter new name" required />
            <input type="hidden" name="userId" value="${user.id}" />
            <input type="file" onchange="previewFile()" name="profile_image" accept="image/*" class="new-profile-input" />
            <img src="" class="profile-preview" alt="Image preview...">
            <button type="submit" class="generic-button" id="update-profile"> Update Profile </button>
          </form>`)
      })

      // END edit profile

    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  });
}
settingButtonSetup()

// END setting 

// START PWT

const preWrittenMenu  = document.getElementById("pre-written")
let   pwtDeckNumber   = 0
preWrittenMenu.addEventListener("click",()=>{
  menu.innerHTML = `
      <div id="PWT-header"> 
        <div class="side-menu-toolbar">
          <button id="close-menu" type="button"><svg fill="#000000" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460.775 460.775"><g > <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/> </g></svg></button>
          <button id="config-button"><svg  xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 50 50" >    <path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"/></svg></button>
        </div>
        <form action="" id="submit-pre-written-text" >
          <input  id="submit-text" type="text" placeholder="submit-text">
          <button id="submit-pre-written-text-button"> add </button>
        </form>
      </div>
      <div id="PWT-container">
      </div>`

  // START PWT config

  document.getElementById("config-button").addEventListener( "click" , PWTConfigMenu )
  document.addEventListener('keydown', (e) => { if (e.key === "c" && keyState.altPressed) PWTConfigMenu()})

  function setupCheckboxes(configs) {
    configs.forEach(({ id, storageKey }) => {
      const checkbox = document.getElementById(id);
      checkbox.checked = localStorage.getItem(storageKey) === "true"
      checkbox.addEventListener("change", () => localStorage.setItem(storageKey, checkbox.checked))
    })
  }

  function PWTConfigMenu() {
    createMenu(`
      <div id="menu-toolbar">Configuration</div>
      <div class="note-container">
        <p class="note">Add more words at once by separating words with ","</p>
        <p class="note">Press 0 to 9 to simulate clicking on the buttons</p>
        <p class="note">Press 0 to 9 while holding . or \` to switch between decks</p>
      </div>
      <div class="config-container">
        <input type="checkbox" id="send-immediately" class="checkbox custom-checkbox">
        <label for="send-immediately">send immediately</label>
        <br>
        <input type="checkbox" id="add-space" class="checkbox custom-checkbox">
        <label for="add-space">add space after each word</label>
        <br>
        <input type="checkbox" id="list-mode" class="checkbox custom-checkbox">
        <label for="list-mode">list mode</label>
      </div>`)
    
    setupCheckboxes([
      { id: "send-immediately" , storageKey: "pwtSendImmediately" },
      { id: "add-space" , storageKey: "pwtAddSpace" },
      { id: "list-mode" , storageKey: "pwtListMode"}
    ])
    const listModeCheckbox = document.getElementById("list-mode")
    listModeCheckbox.addEventListener("change",()=>{
      if (listModeCheckbox.checked) PWTContainer.classList.add("block")
      else PWTContainer.classList.remove("block")
    })
  }

  // END PWT config

  const PWTForm  = document.getElementById("submit-pre-written-text")
  const PWTInput = document.getElementById("submit-text")
  const PWTContainer = document.getElementById("PWT-container")

  if (localStorage.getItem("pwtListMode") === "true") PWTContainer.classList.add("block")

  moreMenu.style.opacity = `0`  
  moreMenuToggle = false
  loadPWTEntries(pwtDeckNumber)

  // START PWT hotkeys

  document.addEventListener("keydown", (event) => {
    const key = event.key
    const isNumber = key >= "0" && key <= "9"
    if (isNumber){
      if ((keyState.dotPressed || keyState.backtickPressed)) {
        pwtDeckNumber = key
        loadPWTEntries(pwtDeckNumber)
      }
      else if (document.activeElement !== input && document.activeElement !== PWTInput)
        if (document.getElementById(`pwt-${key}`))  document.getElementById(`pwt-${key}`).click()
    }
  })

  // END PWT hotkeys

// Handle PWTForm submission
PWTForm.addEventListener('submit', function(e) {
  e.preventDefault()
  const text = PWTInput.value.trim()
  if (text === "") return

  savePWTEntry(text, pwtDeckNumber)
  PWTInput.value = ''
  loadPWTEntries(pwtDeckNumber)
});

// Close menu button handler
const closeMenuButton = document.getElementById("close-menu");
closeMenuButton.addEventListener("click", closeMenu);

// Close menu function
function closeMenu() {
  menu.innerHTML = `
    <div>
      <button id="setting-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
          <path d="M47.16,21.221l-5.91-0.966c-0.346-1.186-0.819-2.326-1.411-3.405l3.45-4.917c0.279-0.397,0.231-0.938-0.112-1.282 l-3.889-3.887c-0.347-0.346-0.893-0.391-1.291-0.104l-4.843,3.481c-1.089-0.602-2.239-1.08-3.432-1.427l-1.031-5.886 C28.607,2.35,28.192,2,27.706,2h-5.5c-0.49,0-0.908,0.355-0.987,0.839l-0.956,5.854c-1.2,0.345-2.352,0.818-3.437,1.412l-4.83-3.45 c-0.399-0.285-0.942-0.239-1.289,0.106L6.82,10.648c-0.343,0.343-0.391,0.883-0.112,1.28l3.399,4.863 c-0.605,1.095-1.087,2.254-1.438,3.46l-5.831,0.971c-0.482,0.08-0.836,0.498-0.836,0.986v5.5c0,0.485,0.348,0.9,0.825,0.985 l5.831,1.034c0.349,1.203,0.831,2.362,1.438,3.46l-3.441,4.813c-0.284,0.397-0.239,0.942,0.106,1.289l3.888,3.891 c0.343,0.343,0.884,0.391,1.281,0.112l4.87-3.411c1.093,0.601,2.248,1.078,3.445,1.424l0.976,5.861C21.3,47.647,21.717,48,22.206,48 h5.5c0.485,0,0.9-0.348,0.984-0.825l1.045-5.89c1.199-0.353,2.348-0.833,3.43-1.435l4.905,3.441 c0.398,0.281,0.938,0.232,1.282-0.111l3.888-3.891c0.346-0.347,0.391-0.894,0.104-1.292l-3.498-4.857 c0.593-1.08,1.064-2.222,1.407-3.408l5.918-1.039c0.479-0.084,0.827-0.5,0.827-0.985v-5.5C47.999,21.718,47.644,21.3,47.16,21.221z M25,32c-3.866,0-7-3.134-7-7c0-3.866,3.134-7,7-7s7,3.134,7,7C32,28.866,28.866,32,25,32z"/>
        </svg>
      </button>
    </div>`
  settingButtonSetup()
}

// Save a PWT entry to local storage
function savePWTEntry(text, pwtDeckId) {
  let decks = JSON.parse(localStorage.getItem('preWrittenText')) || {};
  if (!decks[pwtDeckId]) decks[pwtDeckId] = [];
  
  decks[pwtDeckId].push({ text: text, deckId: pwtDeckId });
  localStorage.setItem('preWrittenText', JSON.stringify(decks));
}

// Load and render PWT entries
function loadPWTEntries(pwtDeckId) {
  const decks = JSON.parse(localStorage.getItem('preWrittenText')) || {}
  const entries = decks[pwtDeckId] || []
  const container = document.getElementById("PWT-container")
  container.innerHTML = ""
  container.appendChild(createCustomElement("h3", { id: "pwt-deck", text: `deck ${pwtDeckId}` }))

  entries.forEach((entry, index) => 
    container.appendChild(createCustomElement("div", { id: `pwt-${index}`, className: "pre-written-text", text: entry.text }))
  )

  // Set up click event for each PWT entry
  document.querySelectorAll(".pre-written-text").forEach(element => {
    element.addEventListener("click", () => {
      let text = element.innerText
      if (localStorage.getItem("pwtAddSpace")        === "true") text += " "
      if (localStorage.getItem("pwtSendImmediately") === "true") sendMessage(text, replyId)
      else   input.value += text
      
    })
  })
}})
// END PWT

let selectedRange 
let targetedElement
let oldTargetedElement
document.addEventListener("contextmenu", function (e) {
  e.preventDefault()
  const selection = window.getSelection();
  let selectedText = selection.toString().trim();
  targetedElement = e.target.closest('.message-container') // Get the closest .message-container 
  
  if (targetedElement) {
    targetedElement.querySelector(".sent") ?  contextMenu(event, [`copyMessage` , 'reply' , 'hideMessage','invertColor']) : contextMenu(event, [`copyMessage` , 'reply' , 'hideMessage'])
    targetedElement.classList.add("highlight")
    oldTargetedElement = targetedElement
  }

  // right click when user select a text
  if (selectedText){ 
    selectedRange = selection.getRangeAt(0)
    contextMenu(event,['copy'])
  }
  // right click on input
  if (input === document.activeElement) {
    if (selectedText) contextMenu(e,['cut','copy',"paste"])
    else contextMenu(e,["paste"])
  }
})

function contextMenu(event,features) {
  const existingMenu = document.getElementById("context-menu")
  if (existingMenu) {
    if (oldTargetedElement) oldTargetedElement.classList.remove("highlight")
    existingMenu.remove()
  }

  const menu = document.createElement("div");
  menu.id    = "context-menu"
  // add element depending on where user right clicks
  features.forEach(element => {
    if (element == "copyMessage") menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"copy-message", onClick: copyMessage,text : "Copy" }  ))
    if (element == "hideMessage") menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"hide-message", onClick: hideMessage,text : "Hide" }  ))
    if (element == "invertColor") menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"invert-color", onClick: invertColor,text : "Invert content color " }  ))
    if (element == "copy")        menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"copy",  onClick: copy ,text : "Copy" }  ))
    if (element == "cut")         menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"cut" ,  onClick: cut  ,text : "Cut" }  ))
    if (element == "reply")       menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"reply", onClick: reply,text : "Reply" }  ))
    if (element == "paste")       menu.appendChild(createCustomElement("div",{ className: "right-click-item", id:"paste", onClick: paste,text : "Paste" }  ))
  });
  body.appendChild(menu);
  
  // Adjust the position of the menu within the viewport
  menu.style.left  = `${Math.min(event.pageX, window.innerWidth  - menu.offsetWidth )}px`
  menu.style.top   = `${Math.min(event.pageY, window.innerHeight - menu.offsetHeight)}px`

  // Remove the menu when clicking outside
  document.addEventListener("click", function () {
    if (targetedElement)  targetedElement.classList.remove("highlight")
    menu.remove()
  } , { once: true })
}

// START right click functions
async function copy() {
    const selection = window.getSelection();
    if (selectedRange) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);  // Restore selected range
    }
    if (selection.toString()) {
      await navigator.clipboard.writeText(selection.toString());
      selection.removeAllRanges();  // Clear the selection after copying
    }
}

async function paste() {
  const read = await navigator.clipboard.readText()
  input.value += read
}

async function copyMessage() {
  await navigator.clipboard.writeText(targetedElement.querySelector(".message-text p").innerText)
}

function replyStyle(replyContainer){
  input.setSelectionRange(input.value.length, input.value.length);
  input.style.transition            = "all 0s"
  input.style.borderTopLeftRadius   = "0px"
  input.style.borderTopRightRadius  = "0px"
  input.style.padding               = `0 2%`
  messageContainer.style.height     = `81%`
  input.addEventListener('focus', function() {
    replyContainer.style.border = `solid 2px var(--border-focus)`
  });
  
  input.addEventListener('blur', function() {
    replyContainer.style.border = `solid 2px var(--main-border)`
  })
  window.addEventListener("resize", ()=>{replyContainer.style.width = getComputedStyle(input).width })
}

function reply(){
  if (document.getElementById("reply-container")) removeReply()
  const reply = document.createElement('div')
  reply.id    = "reply-container"
  replyStyle(reply) 
  reply.style.width     = getComputedStyle(input).width
  const closeReply      = document.createElement("button")
  closeReply.id         = "close-reply"
  closeReply.innerHTML  = `<svg fill="#000000" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 460.775 460.775"><g > <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55 c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55 c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505 c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55 l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719 c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/> </g></svg>`
  closeReply.addEventListener( "click" , ()=> removeReply())
  input.focus()

  replyId = targetedElement.querySelector('.message-text').getAttribute('data-message-id')
  form.appendChild(reply)
  reply.appendChild(closeReply)
  reply.appendChild(createCustomElement("p", {className : "reply-username", text : "Replying to " + targetedElement.querySelector('.username').innerText} ))
  reply.appendChild(createCustomElement("p", {className : "reply-text"    , text : targetedElement.querySelector('.message-text p').innerText }  ))
}

function removeReply(){
  messageContainer.style.height    = `88%`
  input.style.borderTopLeftRadius  = "50px"
  input.style.borderTopRightRadius = "50px"
  input.style.padding              = `0 2%` 
  input.style.width                = `80%` 
  replyId                          = null
  document.getElementById("reply-container").remove()
}

function createCustomElement(elementType, { id = "", className = "", text = "", HTML = "",onClick = null} = {}) {
  const element = document.createElement(elementType)

  if (typeof onClick === "function") element.onclick = onClick
  if (text) element.innerText = text
  if (id) element.id = id
  if (className) element.className = className
  if (HTML) element.innerHTML = HTML

  return element
}

function hideMessage(){ messages.removeChild(targetedElement.parentElement) }

function invertColor(){
  const elementFilter = targetedElement.querySelector(".sent")
  elementFilter.style.filter ? elementFilter.style.filter = "" : elementFilter.style.filter = "invert()"
}

// END right click functions

// START pagintion

function loadOlderMessages() {
  const oldestMessageID = parseInt(document.querySelector('[data-message-id]').getAttribute('data-message-id'))
  if (oldestMessageID === 1)  return

  const fetchOptions = {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ messageId: oldestMessageID })
  }

  fetch('/get-older-messages', fetchOptions)
    .then(response => response.json())
    .then(data => {
      const oldScrollHeight = messages.scrollHeight

      data.reverse().forEach(message => { messages.innerHTML = messageTemplate(message) + messages.innerHTML })
      
      messages.scrollTop = messages.scrollHeight - oldScrollHeight
    })
    .catch(error => console.error('Error fetching messages:', error))
}

// END pagintion

// START for debug 
function log(content = undefined){ console.log(content ? content : "ass") }
// END for debug 

// START user status

function updateConnectionStatus(status) {
  const disconnectElement = document.getElementById("disconnected")
  if (disconnectElement) {
    disconnectElement.classList.add("connected")
    disconnectElement.innerText = "connected"
    setTimeout(() => disconnectElement.remove() , 5000)
  }
}

function sendUserStatus(userStatus){
  updateConnectionStatus(userStatus)

  const fetchOptions = {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`, 
      'Content-Type' : 'application/json'  },
    body: JSON.stringify({ status: userStatus })
  }

  fetch('/user-status', fetchOptions)
  .then(response => {
    if (!response.ok) console.error('Failed to update user status', response.statusText)
  })
  .catch(error => {
    console.error('Error updating user status:', error);
  })

  if (userStatus === "offline") setTimeout(() => body.appendChild(createCustomElement( "h1" , {id:"disconnected",text: "disconnected"})), 1000)
}

socket.on("connect",    () => sendUserStatus("online") )
socket.on("disconnect", () => sendUserStatus("offline"))
window.addEventListener('beforeunload', () => sendUserStatus("offline"))

// END user status

// START exam mode functions

function examModeInit(){
  document.getElementById("exam-mode").checked = localStorage.getItem("examMode") === "true"
  document.getElementById("exam-mode-gray-scale").checked = localStorage.getItem("grayScale") ==="true"
  document.getElementById("exam-mode-brightness").value = parseInt(localStorage.getItem("brightness") || 100)
}

function applyFilters() {
  const examModeElement = document.getElementById("exam-mode")

  if (examModeElement){
    // getting element values
    const examMode   = examModeElement.checked 
    const grayScale  = document.getElementById("exam-mode-gray-scale").checked
    const brightness = document.getElementById("exam-mode-brightness").value
    
    // applying filter and saving config
    examModeFilter(examMode,grayScale,brightness)
    examConfig("set", { examMode, grayScale, brightness } )
  } 
  else{
    const { examMode , grayScale , brightness} = examConfig("get")
    if (examMode)  examModeFilter(examMode,grayScale,brightness)
  }
}

function examModeFilter(examMode,grayScale,brightness){
  const grayScaleFilter  = grayScale  ? "grayscale(1)" :  ""
  const brightnessFilter = brightness ? `brightness(${brightness}%)` : "" 
  body.style.filter = examMode ? `${grayScaleFilter} ${brightnessFilter}`.trim() : ""
}

function examConfig(setOrGet,{examMode = "",grayScale = "",brightness = ""}={}){
  if (setOrGet==="set"){
  localStorage.setItem("examMode" ,examMode)  
  localStorage.setItem("grayScale",grayScale)  
  localStorage.setItem("brightness",brightness)  
  }
  else if (setOrGet === "get") {
    return {
      examMode: JSON.parse(localStorage.getItem("examMode")   || "false"),
      grayScale: JSON.parse(localStorage.getItem("grayScale") || "false"),
      brightness: localStorage.getItem("brightness") || "100"
    };
  }
}

function replyToMessage(messageId) {
  // Find the message element to reply to
  const targetMessage = document.querySelector(`.message-text[data-message-id="${messageId}"]`);
  if (targetMessage) {
    // Remove any existing reply
    if (document.getElementById("reply-container")) removeReply();

    // Set up reply container
    replyId = messageId;
    const replyContainer = document.createElement('div');
    replyContainer.id = "reply-container";
    replyContainer.style.width = getComputedStyle(input).width;

    // Add reply information and close button
    replyContainer.innerHTML = `
      <p class="reply-username">Replying to ${targetMessage.closest('.message-container').querySelector('.username').innerText}</p>
      <p class="reply-text">${targetMessage.innerText}</p>
      <button id="close-reply" onclick="removeReply()">Close</button>
    `;
    
    // Add the reply container above the input box
    form.appendChild(replyContainer);
    input.focus(); // Focus on input
  }
}

document.addEventListener("keydown", (event) => {
  // Toggle auto-scroll with Ctrl + F
  if (event.ctrlKey && event.key === "f") {
    autoScrollEnabled = !autoScrollEnabled; // Toggle auto-scroll

    // Feedback message
    if (autoScrollEnabled) {
      console.log("Auto-scroll enabled");
      scrollToBottom(true); // Scroll to the bottom immediately if re-enabled
    } else {
      console.log("Auto-scroll disabled");
    }
  }
});

// END exam mode functions