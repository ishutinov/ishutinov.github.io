var Controls = function(w,a,s,d) {
    var up = w || false,
        left = a || false,
        right = d || false,
        down = s || false;

    var onKeyDown = function(e) {
        var that = this,
            c = e.keyCode;
        switch (c) {
            // Controls
            case 65: // A (Left)
                that.left = true;
                break;
            case 87: // W (Up)
                that.up = true;
                break;
            case 68: // D (Right)
                that.right = true;
                break;
            case 83: // S (Down)
                that.down = true;
                break;
            //case 13: // Enter (Chat)
            //case 16: // Shift (Chat)
            case 192: // ~ (Chat)
                showChat();
                break;
        }
    };

    var onKeyUp = function(e) {
        var that = this,
            c = e.keyCode;
        switch (c) {
            case 65: // A (Left)
                that.left = false;
                break;
            case 87: // W (Up)
                that.up = false;
                break;
            case 68: // D (Right)
                that.right = false;
                break;
            case 83: // S (Down)
                that.down = false;
                break;
        }
    };

    return {
        up: up,
        left: left,
        right: right,
        down: down,
        onKeyDown: onKeyDown,
        onKeyUp: onKeyUp
    };
};
