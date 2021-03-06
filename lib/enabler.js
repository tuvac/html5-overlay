'use strict';

var ads = require('ad-utils/lib/helper'),
    dim = require('ad-utils/lib/dimensions');

window.AdOps = window.AdOps || {};

window.AdOps.overlay = function(options) {

    var config = {
        width: undefined,
        height: undefined,
        clickUrl: 'http://www.example.com',
        src: 'about:blank',
        delay: 15,
        iframeId: 'HTML5OverlayFrame'
    };

    var d = document,
        frame,
        originalStyles,
        timer,
        open = false;

    function setConfiguration() {

        for (var key in options) {

            if (config.hasOwnProperty(key)) {

                config[key] = options[key];
            }
        }
    }

    function position() {

        var width = config.width,
            height = config.height,
            pos;

        if (width === undefined && height === undefined) {

            var dims = dim.windowSize();
            width = dims.width;
            height = dims.height;
        }

        pos = dim.calculateCenter(width, height);

        frame.setAttribute('width', width);
        frame.setAttribute('height', height);
        frame.setAttribute('style', 'border: none; position: fixed; z-index: 9999990;');
        frame.style.top = pos.y + 'px';
        frame.style.left = pos.x + 'px';

        if (open) {
            frame.contentWindow.postMessage({
                overlay: {
                    events: 'RESIZED'
                }
            }, '*');
        }
    }

    function createFrame(src) {

        var f = d.createElement('iframe');
        f.setAttribute('id', config.iframeId);
        f.setAttribute('marginwidth', 0);
        f.setAttribute('marginheight', 0);
        f.setAttribute('frameborder', 0);
        f.setAttribute('scrolling', 'no');
        f.setAttribute('allowtransparency', true);
        f.setAttribute('src', src);
        f.onload = function() {
            open = true;
            this.contentWindow.postMessage({
                overlay: {
                    events: 'OPENED'
                }
            }, '*');
        };
        window.parent.document.body.appendChild(f);

        return f;
    }

    function closeAd() {

        if (timer) {

            window.clearTimeout(timer);
        }

        if (originalStyles && originalStyles.length > 0) {
            ads.applyStyles(originalStyles, window.parent.document);
            originalStyles = null;
        }

        frame.contentWindow.postMessage({
            overlay: {
                events: 'CLOSED'
            }
        }, '*');

        //add a small delay to allow closed message to complete
        setTimeout(function() {
            frame.parentNode.removeChild(frame);
            removeListeners();
        }, 50);
    }

    function handleMessage(e) {

        if (!e.origin.match(/websure\.org|discoveryint1\.edgeboss\.net|dniadops-a\.akamaihd\.net/i) ||
            !e.data.overlay || !e.data.overlay.action) {
            return;
        }

        if (e.data.overlay.action === 'INIT') {

            config.width = e.data.overlay.payload.width;
            config.height = e.data.overlay.payload.height;
            position();
        }

        if (e.data.overlay.action === 'CLOSE') {
            closeAd();
        }

        if (e.data.overlay.action === 'CLICK') {

            window.open(decodeURIComponent(config.clickUrl));
        }

        if (e.data.overlay.action === 'APPLY_STYLES' && e.data.overlay.payload) {
            originalStyles = ads.applyStyles(e.data.overlay.payload,
                window.parent.document);
        }
    }

    function removeListeners() {
        ads.removeEvent('resize', position, window.top);
        ads.removeEvent('scroll', position, window.top);
        ads.removeEvent('message', handleMessage, window.top);
    }

    if (options) {
        setConfiguration();
    }

    return {

        init: function() {

            var old = window.parent.document.getElementById(config.iframeId);

            if (old) {
                old.parentNode.removeChild(old);
                removeListeners();
            }

            frame = createFrame(config.src);

            ads.addEvent('resize', position, window.top);
            ads.addEvent('scroll', position, window.top);
            ads.addEvent('message', handleMessage, window.top);

            if (config.delay && !isNaN(config.delay)) {

                timer = window.setTimeout(closeAd, config.delay * 1000);
            }

        }
    };
};
