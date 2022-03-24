var Player = function(startX,startY,startAngle,playerName,playerTitle,isEliminated,isLocal,startPoints) {
    var x = startX,
        y = startY,
        angle = startAngle,
        id,
        moveAmount = PLAYER_SPEED,
        name = playerName,
        title = playerTitle,
        eliminated = isEliminated,
        local = isLocal,
        // players skins
        img = isEliminated ? img_redplayer : img_blueplayer,
        points = startPoints || 0;

    // getters and setters
    var getID = function() {
        return id;
    }

    var getX = function() {
        return x;
    };

    var getY = function() {
        return y;
    };

    var getAngle = function() {
        return angle;
    };

    var getName = function() {
        return name;
    };

    var getTitle = function() {
        return title;
    };

    var isEliminated = function() {
        return eliminated;
    };

    var getPoints = function() {
        return points;
    };

    var setX = function(newX) {
        x = newX;
    };

    var setY = function(newY) {
        y = newY;
    };

    var setAngle = function(newAngle) {
        angle = newAngle;
    };

    var setName = function(newName) {
        name = newName;
    };

    var setTitle = function(newTitle) {
        title = newTitle;
    };

    var setEliminated = function(elimination) {
        eliminated = elimination;
        img = eliminated ? img_redplayer : img_blueplayer;
    };

    var setPoints = function(newPoints) {
        points = newPoints;
    };

    // Update player position
    var update = function(keys, delta) {
        // Previous position
        var prevX = x,
            prevY = y,
            prevAngle = angle;

        // Up key takes priority over down
        if (keys.up) {
            y -= delta * moveAmount;
        }
        if (keys.down) {
            y += delta * moveAmount;
        }

        // Left key takes priority over right
        if (keys.left) {
            x -= delta * moveAmount;
        }
        if (keys.right) {
            x += delta * moveAmount;
        }

        // Calculate angle
        angle = calculateAngle(x, y);

        return (prevX != x || prevY != y) ? true : false;
    };

    // Draw player
    // playerID from other object, undefined
    var draw = function(ctx, playerID) {
        ctx.save();
        if (isLocal) {
            ctx.fillStyle = "yellow";
        } else {
            ctx.fillStyle = "white";
        }
        ctx.fillRect(x-5, y-5, 10, 10);
        // player name
		ctx.font="bold 14px sans-serif";
		ctx.textAlign = "left";
		ctx.shadowColor="black";
		ctx.shadowBlur=2;
		ctx.lineWidth=2;
		ctx.strokeText(name,x,y-40);
		ctx.shadowBlur=0;
		ctx.fillText(name,x,y-40);
        // player title
        ctx.fillStyle = "#000";
        ctx.textAlign = "left";
        ctx.fillText(title, x, y-60);
        // player flag country
        ctx.beginPath();
		ctx.rect(x-20, y-50, 15, 10);
		ctx.fillStyle = "blue";
		ctx.fill();
		ctx.beginPath();
		ctx.rect(x-20, y-45, 15, 5);
		ctx.fillStyle = "yellow";
		ctx.fill();
        // end player flag
        ctx.restore();
        // круг
		ctx.fillStyle = "#c82124"; //red
        ctx.beginPath();
    	ctx.arc(x,y,33,0,Math.PI*2,true);
    	ctx.fill();
    	// контур круга

    	ctx.fillStyle = "#3a090a"; //red
        ctx.lineWidth = 3;
    	ctx.arc(x,y,33,0,Math.PI*2,true);
    	ctx.stroke();

        // Draw shadow & player
        drawRotatedImage(img_playershadow, x+5, y+5, angle);
        if (latestWinnerName == getName() && isEliminated()) {
            drawRotatedImage(img_winner, x, y, angle);
        } else {
            drawRotatedImage(img, x, y, angle);
        }

    };

    // Define which variables and methods can be accessed
    return {
        getX: getX,
        getY: getY,
        setX: setX,
        setY: setY,
        getAngle: getAngle,
        setAngle: setAngle,
        isEliminated: isEliminated,
        setEliminated: setEliminated,
        update: update,
        draw: draw,
        id: id,
        getName: getName,
        setName: setName,
        getTitle: getTitle,
        setTitle: setTitle,
        getPoints: getPoints,
        setPoints: setPoints
    };
};
