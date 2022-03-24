var canvas,         // Canvas DOM element
    ctx,            // Canvas rendering context
    chat,			// Chat DOM element
    controls,       // Keyboard input
    playerName,		// Input player name
    localPlayer,    // Local player
    remotePlayers,  // Remote players
    bullets,          // Shooting bullets
    socket,         // Socket connection
    mouseX,
    mouseY,
    shotTimer = 0,  // 0 if not loading a shot, negative if cooling off, positive if loading a shot
    fps = 0,        // Keeps track of FPS
    pingSentDate,   // Date object of when the latest ping request was sent
    pingTime = 0,    // Latest ping value, in milliseconds
    playerList,     // List of players and points drawn on canvas
    paused = false, // Whether game is paused or not
    countdown,      // Countdown number for new round
    latestWinnerName;

// Images
var img_blueplayer,
    img_redplayer,
    img_playershadow,
    //img_shadowborder,
    img_bullet,
    img_bulletshadow,
    img_winner;

// Sounds
var snd_throw; // Shot
var snd_hit; // Shot hit
var snd_start; // Round start

// Globals
var MAX_SHOT_LOADING_TIME = 80,     // ??? alert
    GAMESERVER_PORT = 7777,         // Game server port
	PLAYER_SPEED = 2,               // Player speed
    SHOT_COOLOFF_TIME = 60,
    RING_RADIUS = 225,
    RING_RADIUS_SQUARED = RING_RADIUS * RING_RADIUS,
    WIDTH = 800,
    HEIGHT = 600;

function boot() {
	var status = document.getElementById("status");
	playerName = document.getElementById("name").value;
	if (playerName.match(/^[a-z0-9_]+$/i) === null) {
		status.innerHTML = "Возникла ошибка, введите правильное имя.";
		return false;
	} else if (playerName.length > 16) {
		status.innerHTML = "Возникла ошибка, имя должно быть от 3 до 16 символов.";
		playerName = playerName.substring(0, 15);
		return false;
    } else if (playerName.length < 3) {
		status.innerHTML = "Возникла ошибка, имя должно быть от 3 до 16 символов.";
        return false;
    } else if (playerName.toLowerCase() == "info") {
		status.innerHTML = "Возникла ошибка, сервисные имена зарезервированы системой.";
        return false;
	} else {
		document.getElementById("preload").style.display = "none";
		document.getElementById("area").style.overflow = "visible";
		document.getElementById("chatBtn").style.display = "block";
		init();
		animate();
    }
}

function init() {
	var canvasElement = document.createElement("canvas");
	canvasElement.id = "play";
	document.getElementById("game").appendChild(canvasElement);
	canvas = document.getElementById("play");
	chat = document.getElementById("chat");
	ctx = canvas.getContext("2d");

	canvas.width = WIDTH;
	canvas.height = HEIGHT;

    // Initialise socket connection
    //url = "http://" + document.domain;
    url = "https://detailed-canyon-buckaroo.glitch.me";
    socket = io.connect(url, {port: GAMESERVER_PORT, transports: ['websocket']});

    // Load images etc.
    loadResources();

    // Initialise keyboard controls
    controls = new Controls();

    // Initialise the local player
    localPlayer = new Player(100, 100, 0, playerName, "title", true, true);

	// Initialise arrays
	remotePlayers = [];
	bullets = [];

    // Start listening for events
    setEventHandlers();
}

function loadResources() {
    img_blueplayer = new Image();
    img_blueplayer.src = "images/blue.png";
    img_redplayer = new Image();
    img_redplayer.src = "images/red.png";
    img_playershadow = new Image();
    img_playershadow.src = "images/player_shadow.png";
    img_bullet = new Image();
    img_bullet.src = "images/bullet.png";
    img_bulletshadow = new Image();
    img_bulletshadow.src = "images/bullet_shadow.png";
    img_tree = new Image();
    img_tree .src = "images/saved/tree2.png";
    img_winner = new Image();
    img_winner.src = "images/red_winner.png";
    snd_hit = new Audio("audio/shot_hit.mp3");
    snd_throw = new Audio("audio/shot.mp3");
    snd_start = new Audio("audio/round_start.ogg");
}

var setEventHandlers = function() {
    // Keyboard
    window.addEventListener("keydown", onKeydown, false);
    window.addEventListener("keyup", onKeyup, false);

    // Mouse
    canvas.onmousemove = onMouseMove;
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup   = onMouseUp;

    // Socket connection successful
    socket.on("connect", onSocketConnected);

    // Socket disconnection
    socket.on("disconnect", onSocketDisconnect);

    // New player message received
    socket.on("new player", onNewPlayer);

    // New bullet message received
    socket.on("new bullet", onNewBullet);

    // Player move message received
    socket.on("update", onUpdatePlayer);

    // Player removed message received
    socket.on("remove player", onRemovePlayer);

    // A player eliminated
    socket.on("hit", onHit);

    // Ping response message received
    socket.on("ping", onPing);

    // Chat message received
    socket.on("msg", onMessage);

    // Current round is over
    socket.on("game over", onGameOver);

    // New game starts
    socket.on("newgame", onNewGame);

    // Error
    socket.on("error", onError);

    // Server asks for name
    socket.on("ask name", onAskName);
};

// Mouse move
function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left,
    mouseY = e.clientY - rect.top;
}

// Mouse button down - start to shoot
function onMouseDown(e) {
    if (shotTimer === 0) {
        shotTimer = 40;
    }
}

// Mouse button up - launch the bullet with a speed proportional to loading time
function onMouseUp(e) {
    if (shotTimer > 0) {
        var rect = canvas.getBoundingClientRect(),
            speed = Math.min(Math.floor(shotTimer / 10), 8),
            x = localPlayer.getX(),
            y = localPlayer.getY(),
            angle = localPlayer.getAngle();

        // Send bullet data to the game server
        socket.emit("new bullet", {x: x, y: y, angle: angle, speed: speed});
        // ORIGINAL
        //shotTimer = -SHOT_COOLOFF_TIME;
        shotTimer = -SHOT_COOLOFF_TIME;
    } else {
        // TODO bugi
    }
}

// Keyboard key down
function onKeydown(e) {
    if (localPlayer) {
        controls.onKeyDown(e);
    }
}

// Keyboard key up
function onKeyup(e) {
    if (localPlayer) {
        controls.onKeyUp(e);
    }
}

// Socket connected
function onSocketConnected() {
    console.log("Connected to server");
    onMessage({name: "Info", msg: "Подключение к серверу."});
}

// Socket disconnected - most probably due to same IP error
function onSocketDisconnect() {
	//удаляем всех игроков
    remotePlayers = [];
    //удаляем все выстрелы игроков
    bullets = [];
    updatePlayerList();
    onMessage({name: "Info", msg: "Соединение с сервером было нарушено."});
    console.log("Disconnected from socket server");
}

// New player
function onNewPlayer(data) {
    //onMessage({name: "Info", msg: data.name + " подключился к игре"});

    // Initialise the new player
    var newPlayer = new Player(data.x, data.y, data.angle, data.name, data.title, data.eliminated, false, data.points);
    newPlayer.id = data.id;

    // Add new player to the remote players array
    remotePlayers.push(newPlayer);

    // Update list of players drawn on canvas
    updatePlayerList();
    console.log("New player connected. name: "+data.name+" | id: "+data.id);
}

// New shot bullet
function onNewBullet(data) {
    snd_throw.currentTime = 0;
    snd_throw.play();

    // Initialise the new bullet
    var newBullet = new Bullet(data.x, data.y, data.angle, data.speed);

    // Add new bullet to the bullets array
    bullets.push(newBullet);
    console.log("Create new game object: bullet");
}

// Update a player (position, angle, elimination state, points)
function onUpdatePlayer(data) {
    var player = data.local ? localPlayer : playerById(data.id);

    if (!player) {
        return;
    }

    if ("x" in data) {
        player.setX(data.x);
        player.setY(data.y);
    }

    if ("angle" in data) {
        player.setAngle(data.angle);
    }

    if ("name" in data) {
        player.setName(data.name);
    }

    if ("title" in data) {
        player.setTitle(data.title);
    }

    if ("eliminated" in data) {
        player.setEliminated(data.eliminated);
        updatePlayerList();
    }

    if ("points" in data) {
        player.setPoints(data.points);
        updatePlayerList();
    }

    /*
    if ("id" in data && data.local) {
        console.log("ID change: " + data.id);
        player.id = data.id;
    }
    */
}

// Remove player
function onRemovePlayer(data) {
    var removePlayer = playerById(data.id);

    // Player not found
    if (!removePlayer) {
        console.log("Player not found: "+data.id);
        return;
    }

    // Remove player from array
    remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);

    // Update list of players drawn on canvas, notify the local player
    updatePlayerList();
    onMessage({msg: data.name + " покинул игру", name: "Info"});
}

// Local player hit by another player
function onHit(data) {
    console.log(data);
    var eliminated = playerById(data.eliminatedId),//стрелявший
        eliminator = playerById(data.eliminatorId);//убитый

    // Check if local player was hit or hit someone else
    if (!eliminated) {// && data.eliminatedId == localPlayer.id) {
        eliminated = localPlayer;
    } else if (!eliminator) { //&& data.eliminatorId == localPlayer.id) {
        eliminator = localPlayer;
    }
    console.log("1." + eliminator === localPlayer);
    console.log(eliminated === localPlayer);
    // Update hitters & hittees points
    eliminated.setPoints(data.eliminatedPoints);
    eliminator.setPoints(data.eliminatorPoints);

    snd_hit.play();

    // more players lags
    // Notify client, update canvas player list
    onMessage({ name: "Info", msg: eliminator.getName()  + " убил " + eliminated.getName()});
    updatePlayerList();

}

// Ping response received
function onPing() {
    pingTime = new Date() - pingSentDate;
}

// Chat message received
function onMessage(data) {
	var date = new Date();
	var elem = document.createElement("div"),
		timeStr = ('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2);
	elem.innerHTML = "[" + timeStr + "] <strong>" + data.name + "</strong>: " + data.msg;
	chat.appendChild(elem);
    chat.scrollTop = chat.scrollHeight;
}

// Current round is over
function onGameOver(data) {
    var msg;
    if (data.winner) {
        latestWinnerName = data.winner;
        msg = "Раунд завершен. Ведущий следующего раунда <b>" + data.winner + "</b>.";
    } else {
        msg = "Раунд завершен.";
    }
    onMessage({name: "Info", msg: msg});
    bullets.length = 0;  // Clear all bullets
    canvas.onmousedown = null;
    canvas.onmouseup   = null;
    paused = true;
    countdown = 6;
    startCountdown();
}

// New game starts
function onNewGame(data) {
    onMessage({name: "Info", msg: "Начало новой игры"});
    snd_start.play();
    bullets.length = 0;  // Clear all bullets
    canvas.onmousedown = onMouseDown;
    canvas.onmouseup   = onMouseUp;
    paused = false;
}

// Server-side error
function onError() {
	updatePlayerList();
    onMessage({name: "System", msg: "Сервер в данный момент недоступен. Пожалуйста, попробуйте позже."});
}

// Server asks for name
function onAskName() {
    onMessage({name: "Info", msg: "Добро пожаловать " + playerName});
	socket.emit("new player", {name: playerName});
}

var fpsDate = new Date(),
	loopCount = 0,
	delta,
	deltaDate = new Date();

function animate() {
    // Calculate delta time
    var now = new Date();
    delta = ((now - deltaDate) / 1000) * 60;
    delta = Math.round(delta * 1000) / 1000;
    deltaDate = now;

    // Update game state, draw the frame
    update(delta);
    draw();


    // Calculate FPS and send a ping request every 200 frames
    if (++loopCount == 200) {
        loopCount = 0;
        d0 = new Date();
        fps = Math.round(200000 / (d0 - fpsDate));
        fpsDate = d0;
        sendPing();
    }

    // Request a new animation frame using Paul Irish's shim
    window.requestAnimFrame(animate);
}

function update(delta) {
	// Update local player and check for change
	if (localPlayer.update(controls, delta)) {
        // Restrict player movement
        restrictPlayerMovement(localPlayer);

		// Send local player data to the game server
		socket.emit("move player", {x: localPlayer.getX(), y: localPlayer.getY(), angle: localPlayer.getAngle()});
	}

	// Update bullets
	for (var i = 0; i < bullets.length; i++) {
		if (!bullets[i].update(delta)) {
			// bullet out of screen, remove from list
			bullets.splice(i, 1);
			//console.log("Пуля за пределами региона");
		}
	}

	// Increase the shotTimer if loading a shot, or cooling one off
	if (shotTimer !== 0) {
		shotTimer++;
	}
}

function draw() {
    // Wipe the canvas clean
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If loading a shot or cooling a shot off, draw loading bar
    if (shotTimer && localPlayer.isEliminated()) {
        drawLoadingBar();
    }

    // Draw the local player
    localPlayer.draw(ctx, localPlayer.id);


    // Draw the remote players
    for (var i = 0; i < remotePlayers.length; i++) {
        remotePlayers[i].draw(ctx, remotePlayers[i].id);
    }

    // Draw local and remote bullets
    for (var j = 0; j < bullets.length; j++) {
        bullets[j].draw(ctx);
    }

    drawPlayerList();
    drawInfo();


    //if (paused) {
    if (paused) {
        drawPaused();
    }
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Draw a shot loading bar under the local player
function drawLoadingBar() {
    var x = localPlayer.getX() - 40,
        y = localPlayer.getY() + 40,
        fillPercent;
        fillWidth = Math.min(((Math.abs(shotTimer)-40)/40)*60, 60);

    ctx.save();
    ctx.fillStyle = "red";
    ctx.fillRect(x, y, 60, 8);

    if (shotTimer > 0) {
        fillPercent = (shotTimer - 40) / 40;
        ctx.fillStyle = "green";
    // DEBUG START
        //ctx.strokeText(fillPercent,x-40,y-40);
    // DEBUG END
    } else {
        fillPercent = Math.abs(shotTimer) / SHOT_COOLOFF_TIME;
        ctx.fillStyle = "orange";
    }

    ctx.fillRect(x, y, Math.min(fillPercent * 60, 60), 8);
    ctx.restore();
}

// Draw an image
function drawImage(image, x, y) {
    // shadow start
    //ctx.shadowOffsetX = 5;
    //ctx.shadowOffsetY = 5;
    //ctx.shadowColor="#000";
    //ctx.shadowBlur = 4;
    // shadow end
    ctx.save();
    ctx.translate(x, y);
    ctx.drawImage(image, -(image.width/2), -(image.height/2));
    ctx.restore();
}

function drawPlayerList() {
    if (!playerList) {
        return;
    }
    ctx.save();
	ctx.fillStyle = "white";
	ctx.font="bold 14px ubuntu";
	ctx.textAlign = "left";
	ctx.shadowColor="black";
	ctx.shadowBlur=2;
	ctx.lineWidth=2;
    var height;
    for (var i = 0; i < playerList.length; i++) {
        height = canvas.height - (i+1) * 16;
        if (playerList[i].eliminated) {
            ctx.fillStyle = "red";
            ctx.fillText("x", 5, height);
            ctx.fillStyle = "white";
        }
       //ctx.strokeText(playerList[i].name, 20, height);
        ctx.fillText(playerList[i].name, 20, height);
        //ctx.strokeText(playerList[i].points, 100, height);
        ctx.fillText(playerList[i].points, 100, height);

    }
    ctx.restore();

}

// Draw debugging info
function drawInfo() {
    var lines = ["fps: " + fps, "ping: " + pingTime];
    ctx.save();
    ctx.fillStyle = "white";
	ctx.font="normal 12px ubuntu";
	ctx.textAlign = "left";
	ctx.shadowColor="black";
	ctx.shadowBlur=2;
	ctx.lineWidth=2;
    for (var i = 0; i < lines.length; i++) {
		ctx.strokeText(lines[i], canvas.width - 70, (i+1)*20);
		ctx.shadowBlur=0;
        ctx.fillText(lines[i], canvas.width - 70, (i+1)*20);
    }
    ctx.restore();
}

// Draw pause screen
function drawPaused() {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#33CCFF";
    ctx.fillRect(2*canvas.width/8, canvas.height/8, 4*canvas.width/8, 6*canvas.height/8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000";
    ctx.font = "40pt ubuntu";
    ctx.textAlign = "center";
    ctx.fillText("Начало раунда через", canvas.width/2, 2*canvas.height/8);
    ctx.font = "200pt ubuntu";
    ctx.fillText(countdown, canvas.width/2, 7*canvas.height/10);
    ctx.restore();
}

// Draw rotated image
function drawRotatedImage(image, x, y, angle) {
    // save the current co-ordinate system before we screw with it
    ctx.save();

    // move to the middle of where we want to draw our image
    ctx.translate(x, y);

    // rotate around that point, converting our angle from degrees to radians
    ctx.rotate(angle);

    // draw it up and to the left by half the width
    // and height of the image
    ctx.drawImage(image, -(image.width/2), -(image.height/2));

    // and restore the co-ords to how they were when we began
    ctx.restore();
}

// Player can't leave/enter the circle
function restrictPlayerMovement(player) {
/**
	var relativeX = player.getX() - WIDTH/2;
    var relativeY = player.getY() - HEIGHT/2;
    var over_border = player.isEliminated() ?
                      Math.pow(relativeX, 2) + Math.pow(relativeY, 2) < RING_RADIUS_SQUARED
                    : Math.pow(relativeX, 2) + Math.pow(relativeY, 2) > RING_RADIUS_SQUARED;

    if (over_border) {
        var vectorLength = Math.sqrt(Math.pow(relativeX, 2) + Math.pow(relativeY, 2));
        relativeX = (relativeX / vectorLength) * RING_RADIUS;
        relativeY = (relativeY / vectorLength) * RING_RADIUS;

    }
    player.setX(WIDTH/2 + relativeX);
    player.setY(HEIGHT/2 + relativeY);
	**/
    // Prevent player from moving over the level border
    if (player.getX() < 50) player.setX(50);
    if (player.getY() < 50) player.setY(50);
    if (player.getX() > WIDTH-50) player.setX(WIDTH-50);
    if (player.getY() > HEIGHT-50) player.setY(HEIGHT-50);
}

// Вычисляем угол между осью х и на точке объекта, в радианах
function calculateAngle(objectX, objectY) {
    return Math.atan2(mouseY - objectY, mouseX - objectX);
}

// Find player by ID
function playerById(id) {
    var i;
    for (i = 0; i < remotePlayers.length; i++) {
        if (remotePlayers[i].id == id)
            return remotePlayers[i];
    }

    return false;
}

// Send a ping request
function sendPing() {
    pingSentDate = new Date();
    socket.emit("ping");
}

// Send a chat message
function sendMessage() {
    var textbox = document.getElementById("chatMsg"),
        rawMsg = textbox.value;
	msg = rawMsg.trim().substr(0, 100);
	if (msg) {
		console.log(localPlayer.getName()+": " + msg);
		socket.emit("msg", {name: localPlayer.getName(), msg: msg});
		onMessage({name: localPlayer.getName(), msg: msg});
	}
    textbox.value = "";
    textbox.focus();

}

// Update the list of players and points drawn on canvas
function updatePlayerList() {
    var players = remotePlayers.slice();
    players.push(localPlayer);
    players.sort(function (a,b) {return a.getPoints() - b.getPoints();});
    playerList = players.map(function (player) {
        return {id: player.id, name: player.getName(), points: player.getPoints(), eliminated: player.isEliminated()};
    });


}

// Counts down from 4
function startCountdown() {
    if (--countdown !== 0) {
        setTimeout(startCountdown, 1000);
    }
}

// Repeat a string - "abc".repeat(2) -> "abcabcabc"
String.prototype.repeat = function(num)
{
    return new Array(num + 1).join(this);
};
