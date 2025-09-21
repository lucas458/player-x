
Math.clamp = (value, min, max) => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}; 


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}


function map(x, in_min, in_max, out_min, out_max) {
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}


function shuffleArray( arr = [] ){
    for (let i = arr.length - 1; i >= 1; i--){
        let j = getRandomInt(0, i + 1);
        let temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}



/*
REPEATMODE type:
0: off
1: repeat
2: repeat one
*/
var REPEATMODE  = 0;
var REPEATCOUNT = 0;
var SHUFFLEMODE = false;

var SONGINDEX    = -1;
var PLAYLIST     = [];
var PLAYLIST_OLD = []; 

var FAVORITES = [
    "root/Chance Favors the Prepared Mind [EP]/Midwife Crisis (UVB-76).mp3",
    "root/Pompeii/Death March.mp3"
];





const audioManager = new Audio();

var player_cover_container_initX = 0;
var progressIsPressed = false;

var screenTouchInit = {x: 0, y: 0};
var touchThreshold  = {x: false, y: false};


ontouchstart = (event) => {
    screenTouchInit = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
    };
};

ontouchend = () => {
    screenTouchInit = {x: 0, y: 0};
    touchThreshold  = {x: false, y: false};
};

ontouchmove = (event) => {

    if ( Math.abs(event.touches[0].clientX - screenTouchInit.x) > 10 && !touchThreshold.y ){
        touchThreshold.x = true;
        return;
    }
    
    if ( Math.abs(event.touches[0].clientY - screenTouchInit.y) > 10 && !touchThreshold.x ){
        touchThreshold.y = true;
    }
};








function playPause(){
    if ( audioManager.paused ){
        play();
        return;
    }
    pause();
}


function play( path ){

    if ( path != null ){
        audioManager.src = path;
    }
    
    if ( PLAYLIST.length == 1 && audioManager.src == '' ){
        playSongByPlaylistIndex(0, true, true);
    }
    
    audioManager.play().then(setPlayPauseButton).catch();
}


function pause(){
    audioManager.pause();
    setPlayPauseButton(true);
}


function next(){

    if ( SONGINDEX + 1 >= PLAYLIST.length ){
        return;
    }
    
    setPlayerCoverContainerByIndex($(".player_cover_screen_active").index()+1, 100, 0);

    setTimeout(()=>{
        playSongByPlaylistIndex(SONGINDEX + 1, true);
    }, 100);
}


function back(){

    if ( SONGINDEX <= 0 ){
        return;
    }
    
    setPlayerCoverContainerByIndex($(".player_cover_screen_active").index()-1, 100, 0);

    setTimeout(()=>{
        playSongByPlaylistIndex(SONGINDEX - 1, true);
    }, 100);
}





 








function playSongByPlaylistIndex( index = 0, clearRepeatCounter = false, forcePlay = true ){
    SONGINDEX = index; 
    const currentSong = PLAYLIST[ SONGINDEX ];

    if ( clearRepeatCounter ){
        REPEATCOUNT = 0;
    }
    
    if ( $(player_screen).offset().top != 0 ){
        showHiddenMoveableHeaderScreen($(player_screen), true, 100);
    }
    
    navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album 
    });
    

    navigator.mediaSession.setActionHandler("previoustrack", SONGINDEX <= 0? null : back);
    navigator.mediaSession.setActionHandler("nexttrack", SONGINDEX >= PLAYLIST.length-1? null : next);

    generateCoverSongs();
    setProgressBar(0);
    setSongContent(currentSong.title, currentSong.album, currentSong.artist, currentSong.artwork);
    $(".player_current_song").text(`${SONGINDEX+1}/${PLAYLIST.length}`);
    setPlayListDuration(getTimePlaylistBySongList(PLAYLIST.slice(SONGINDEX, PLAYLIST.length)), getTimePlaylistBySongList(PLAYLIST));
    selectSongByPath( currentSong.url );
    
    if ( forcePlay ){
        play( currentSong.url );
    }
    
    setPlayerScreenHeartState( FAVORITES.indexOf(PLAYLIST[SONGINDEX].url) >= 0 );
    
}






audioManager.ontimeupdate = () => {
    setSongTime(audioManager.currentTime, audioManager.duration);

    if ( progressIsPressed ){
        return;
    }

    setProgressBar( audioManager.currentTime / audioManager.duration * 100 );
};


audioManager.onloadedmetadata = () => {
    setSongTime(audioManager.currentTime, audioManager.duration);
};


audioManager.onended = () => {
    console.warn('song ended');
    
    if ( REPEATMODE == 1 ){
        playSongByPlaylistIndex(SONGINDEX, true);
        return;
    }
        
    if ( REPEATCOUNT++ < 1 && REPEATMODE == 2 ){
        playSongByPlaylistIndex(SONGINDEX, false);
        return;
    }

    if ( SONGINDEX >= PLAYLIST.length - 1 ){
        audioManager.currentTime = 0;
        setSongTime(audioManager.currentTime, audioManager.duration);
        setProgressBar(0);
        setPlayPauseButton(true);
        return;
    }
    
    next();
    
};





$(".tabMenuItem").click(function(){
    const index = $(this).index();
    selectTabMenuByIndex(index, 100);
    moveCarouselScreenByIndex(mainScreenCarousel, index, 100);
});



function selectTabMenuByIndex( index = 0, delayMiliseconds = 0 ){
    const parentElement = $(".tabMenuItem").parent().parent();

    $(".tabMenuItem").removeClass("tabMenuItemSelected");
    $(".tabMenuItem").eq(index).addClass("tabMenuItemSelected");

    $("#mainScreenTabMenuLine").css({
        "width": $(".tabMenuItem").eq(index)[0].offsetWidth + 'px',
        "left": ($(".tabMenuItem").eq(index).offset().left + parentElement[0].scrollLeft) + 'px',
        "transition": delayMiliseconds + 'ms'
    });

    parentElement[0].scrollLeft = $(".tabMenuItemSelected").innerWidth()/2 - (mainScreenTabMenuList.offsetWidth/2 - $(".tabMenuItemSelected")[0].offsetLeft);
    
    console.log('open tab:', $(".tabMenuItem").eq(index).text());

}







var carouselScreenTouchInit = {x: 0, y: 0};
var carouselScreenLocked = false;


function moveCarouselScreenByIndex(parentElement, index = 0, delayMiliseconds = 0){
    index = Math.clamp(index, 0, parentElement.children.length - 1);

    $(parentElement).css({
        'left': -main_screen.offsetWidth * index + 'px',
        'transition': delayMiliseconds + 'ms'
    });

}



$(".carouselScreenContainer").on("touchstart", function(){
    carouselScreenTouchInit = {
        x: screenTouchInit.x - $(this).offset().left,
        y: screenTouchInit.y - $(this).offset().top,
    };
});


$(".carouselScreenContainer").on("touchend", function(){
    const posX  = Math.abs( $(this).offset().left );
    const index = Math.round(posX / main_screen.offsetWidth);
    
    if ( Math.abs(carouselScreenTouchInit.x - posX) <= 10 ){
        return;
    }
    
    moveCarouselScreenByIndex($(this)[0], index, 100);

    if ( $(this)[0].id == "mainScreenCarousel" ){
        selectTabMenuByIndex(index, 100);
    }

});



$(".carouselScreenContainer").on("touchmove", function(event){

    if ( !(touchThreshold.x && !carouselScreenLocked) ){
        return;
    }

    let posX = (event.touches[0].clientX - screenTouchInit.x - carouselScreenTouchInit.x);
    posX = Math.clamp(posX, -main_screen.offsetWidth * ($(this).children().length-1), 0);
    
    let index               = Math.trunc(-posX / main_screen.offsetWidth);
    const newIndexRounded   = Math.round(-posX / main_screen.offsetWidth);
    const offsetX           = $(".tabMenuItem").eq(index)[0].offsetLeft;
    const widthTabMenuItem  = $(".tabMenuItem").eq(index).innerWidth();

    if ( Math.abs(event.touches[0].clientX - screenTouchInit.x) >= main_screen.offsetWidth ){
        posX = -main_screen.offsetWidth * newIndexRounded;
    }

    index           = Math.trunc(-posX / main_screen.offsetWidth);
    const newIndex  = Math.clamp(index + 1, 0, mainScreenTabMenuList.children.length-1);
    const percent   = -posX % main_screen.offsetWidth / main_screen.offsetWidth;


    $("#mainScreenTabMenuLine").css({
        "width": (($(".tabMenuItem").eq(newIndex).innerWidth() - widthTabMenuItem) * percent + widthTabMenuItem) + 'px',
        "left": (percent * widthTabMenuItem + offsetX) + 'px',
        "transition": 0 + 'ms'
    });


    $(this).css({
        'left': posX + 'px',
        'transition': '0s'
    });

    
    $("#mainScreenTabMenuHeader")[0].scrollLeft = $(".tabMenuItemSelected").innerWidth()/2 - (mainScreenTabMenuList.offsetWidth/2 - $("#mainScreenTabMenuLine")[0].offsetLeft);

    $(".tabMenuItem").removeClass("tabMenuItemSelected");
    $(".tabMenuItem").eq(newIndexRounded).addClass("tabMenuItemSelected");

});





function showHiddenMoveableHeaderScreen(parentElement, show = true, delayMiliseconds = 100){
    parentElement.css('transition', delayMiliseconds + 'ms');

    parentElement.find('.screen_header_front').css('opacity', show | 0);
    parentElement.find('.screen_header_front').css('pointer-events', show? 'none': '');

    if ( show ){
        parentElement.css('top', main_screen.offsetHeight - parentElement.children(".screen_header").height() + 'px');
    }else{
        parentElement.css('top', '100%');
    }

    if ( parentElement.attr('id') == 'player_screen' ){
        $("#main_screen").css('transition', '100ms');
        $("#main_screen").css('opacity', 1);
        $("#main_screen").css('top', 0);
    }

}






function toggleMoveableHeaderScreen(parentElement, isUp){
    parentElement.css('transition', '100ms');
    parentElement.find('.screen_header_front').css('opacity', !isUp | 0);
    parentElement.find('.screen_header_front').css('pointer-events', isUp? 'none': '');

    if ( isUp ){
        parentElement.css('top', '0px');
    }else{
        parentElement.css('top', main_screen.offsetHeight - parentElement.children(".screen_header").height() + 'px');
    }
    
    if ( parentElement.attr('id') == 'player_screen' ){
        $("#main_screen").css('transition', '100ms');
        $("#main_screen").css('opacity', isUp? 0.5 : 1);
        $("#main_screen").css('top', (isUp | 0) * -24);

        $("#playlist_screen").css('transition', '');
        $("#playlist_screen").css("top", isUp ? `${$("#playlist_screen").height() - $("#playlist_screen .screen_header").height()}px` : '');

    }else if ( parentElement.attr('id') == 'playlist_screen' ){
        $("#player_screen").css('transition', '100ms');
        $("#player_screen").css('top', (isUp | 0) * -24);
    }

}




$(".screen_header_moveable").on("touchmove", function(event){
    const posY = Math.clamp(event.touches[0].clientY, 0, main_screen.offsetHeight - $(this).height());
    const percent = 1 - posY / ( main_screen.offsetHeight - $(this).height() );
    
    $(this).parent().css('transition', '0ms');
    $(this).parent().css('top', posY + 'px');

    $(this).children('.screen_header_front').css('opacity', 1-percent);
    $(this).children('.screen_header_front').css('pointer-events', percent > 0.5? 'none': '');
    

    if ( $(this).parent().attr("id") == "player_screen" ){
        // PARALLAX MAIN SCREEN
        $("#main_screen").css('transition', '0ms');
        $("#main_screen").css('opacity', Math.clamp(1-percent, 0.5, 1));
        $("#main_screen").css('top', percent * -24);
        // MOVE PLAYLIST SCREEN
        $("#playlist_screen").css('transition', '0ms');
        $("#playlist_screen").css("top", ($("#playlist_screen").height() - $("#playlist_screen .screen_header").height()) + posY);
        $("#playlist_screen").find('.screen_header_front').css('opacity', 1); 
    
    }else if ( $(this).parent().attr("id") == "playlist_screen" ){
        // PARALLAX PLAYER SCREEN
        $("#player_screen").css('transition', '0ms');
        $("#player_screen").css('top', percent * -24);
    }

    
});


$(".screen_header_moveable").on("touchend", function(event){
    const isUp = $(this).parent().offset().top < main_screen.offsetHeight / 2;
    toggleMoveableHeaderScreen( $(this).parent(), isUp );
});


$(".screen_header_moveable").click(function(){
    const isUp = $(this).parent().offset().top < main_screen.offsetHeight / 2;

    if ( $(this).parent().attr('id') == 'player_screen' ){
        showHiddenMoveableHeaderScreen($(playlist_screen), !isUp, 0); 
    }

    toggleMoveableHeaderScreen( $(this).parent(), !isUp );
});



$('.screen_header_button').click(function(event){
    event.stopPropagation();
    console.log('pass');

    if ( $(this).hasClass("heartButton") ){

        const index = FAVORITES.indexOf(PLAYLIST[SONGINDEX].url);
        const isFavorite = index >= 0;

        // REMOVE From Favorite List
        if ( isFavorite ){
            FAVORITES.splice(index, 1);
        }else{
            FAVORITES.push(PLAYLIST[SONGINDEX].url);
        }

        setPlayerScreenHeartState(!isFavorite);
        generateFavoritesItemList();
        

    }

});







function generateFavoritesItemList(){
    $(carouselScreenFavorites).find(".carouselScreenContent").empty();

    FAVORITES.forEach(songPath => {
        const song = getSongInfoByPath(songPath);

        setItemData(
            createItemListElement($(carouselScreenFavorites).find(".carouselScreenContent"), song.title, `${timeFormatter(song.length)} • ${song.artist}`, song.artwork, false),
            song.title,
            song.album,
            song.artist,
            song.url);
    });

    if ( PLAYLIST[SONGINDEX] != null ){
        selectSongByPath( PLAYLIST[SONGINDEX].url );
    }

}










let player_cover_container_index = 0;
 
// SONG IMAGE SWIPE: START
$("#player_cover_container").on("touchstart", function(event){
    player_cover_container_initX = event.touches[0].clientX - $(this).offset().left;
    player_cover_container_index = Math.round($(this).offset().left / -player_screen.offsetWidth);
});


// SONG IMAGE SWIPE: RELEASE
$("#player_cover_container").on("touchend", function(event){
    const index = Math.round($(this).offset().left / -player_screen.offsetWidth);
    let deltaX = index - player_cover_container_index;
    
    if ( player_cover_container_index != index ){
        player_cover_container_index = index;
    }else{
        deltaX = 0;
    } 

    setPlayerCoverContainerByIndex(index, 100, deltaX);
    $('.player_cover_screen').css('transform', 'scale(1) rotateY(0deg)');
    
});


// SONG IMAGE SWIPE: MOVE
$("#player_cover_container").on("touchmove", function(event){

    if ( !touchThreshold.x ){
        return;
    }

    $("#player_cover_screen_active").css('transition', '0ms');

    let posX = event.touches[0].clientX - player_cover_container_initX;
    const activeIndex = parseInt(Math.clamp(posX / -player_screen.offsetWidth, 0, player_cover_container.children.length - 1));
    let percent =   (Math.abs(posX) % player_screen.offsetWidth / player_screen.offsetWidth);

    if ( posX > 0 || posX < (-player_screen.offsetWidth * 2) || player_cover_container.children.length == 1 || (player_cover_container.children.length == 2 && posX < -player_screen.offsetWidth)){
        percent = 0;
    }

    if ( posX > 0 ){
        posX /= 10;
    }else if ( (player_cover_container.children.length == 2 && posX < -player_screen.offsetWidth) || posX <= (-player_screen.offsetWidth * 2) || player_cover_container.children.length == 1 ){
        const maxPosX = (player_cover_container.children.length - 1) * player_screen.offsetWidth;
        posX = -maxPosX + (posX + maxPosX) / 10;
    }

    $('.player_cover_screen_active').removeClass('player_cover_screen_active');
    $('.player_cover_screen').eq(activeIndex).addClass('player_cover_screen_active');

    $('.player_cover_screen:not(.player_cover_screen_active)').css('transform', `scale(${percent*0.1 + 0.9}) rotateY(${-20 * (1-percent)}deg)`);
    $('.player_cover_screen_active').css('transform', `scale(${(1-percent)*0.1 + 0.9}) rotateY(${20 * percent}deg)`);

    $(this).css('transition', '');
    $(this).css('left', posX + 'px');

});





function setPlayerCoverContainerByIndex( index = 0, delayMiliseconds = 0, deltaX){
    index = Math.clamp(index, 0, $("#player_cover_container").children().length - 1);
    $("#player_cover_container").css('left', (-player_screen.offsetWidth * index) + 'px');
    $("#player_cover_container").css('transition', delayMiliseconds + 'ms');

    if ( deltaX == 0 ){
        return;
    }

    setTimeout(()=>{
        (deltaX > 0) ? next() : back(); 
    }, delayMiliseconds + 100);

}







function toggleTimePressCurrent( state ){

    if ( state ){
        $(progressTimeCurrentPress).fadeIn(200);
        return;
    }

    $(progressTimeCurrentPress).fadeOut();
}


function setTimePressCurrent( timeSeconds = 0 ){
    $(progressTimeCurrentPress).text( timeFormatter(timeSeconds) );
}











function togglePopupMenu( state ){ 
    $(popupMenuScreen).css('visibility', state ? '' : 'hidden');
}

function setPopupMenuAt( x = 0, y = 0 ){
    $(popupMenu).css({
        'left': x + 'px',
        'top': y + 'px',
    });
}


function movePopupMenuToOptionButton( buttonElement ){
    
    const buttonElementOffset   = $(buttonElement).offset();
    const popupMenuSize         = [popupMenu.offsetWidth, popupMenu.offsetHeight];
    const screenSize            = [main_screen.offsetWidth, main_screen.offsetHeight];

    let posX = buttonElementOffset.left - popupMenuSize[0] + buttonElement.width();
    let posY = buttonElementOffset.top + buttonElement.height();

    if ( posX < 0 ){
        posX = buttonElementOffset.left;
    }
    
    if ( posY + popupMenuSize[1] > screenSize[1] ){
        posY = screenSize[1] - popupMenuSize[1];
    }

    setPopupMenuAt(posX, posY);
    togglePopupMenu(true);
    
}


function generatePopupMenu( options = []){
    $(popupMenu).empty();

    options.forEach(e => {
        const popupItem = $(`<div class="popupItem">${e.label}</div>`);
        popupItem.click(e.callback);
        $(popupMenu).append(popupItem);
    });

}





$(popupMenu).on('click', ".popupItem", function(event){
    event.stopPropagation();
    setTimeout(()=> togglePopupMenu(false), 100);
});














function generateCoverSongs(){
    $(player_cover_container).empty();

    for (let i = SONGINDEX - 1; i <= SONGINDEX + 1; i++){
        const song = PLAYLIST[i];

        if ( song == null ){
            continue;
        }

        const player_cover_screen = document.createElement('div');

        $(player_cover_screen).addClass('player_cover_screen');
        $(player_cover_screen).append('<div class="player_cover_image"></div>');
        $(player_cover_screen).find(".player_cover_image").css('background-image', `url("${song.artwork}")`);
        $(player_cover_container).append(player_cover_screen);


        $(".player_cover_image").css('height', $(".player_cover_image").width() + 'px');

    }

    $(player_cover_container).css('transition', '');
    const count = $(player_cover_container).children().length;
    player_cover_container_index = count == 3? 2 : 0;
    $(player_cover_container).css('left', count >= 2 && PLAYLIST[SONGINDEX - 1] != null ? '-100%' : '0px');

    const index = Math.round($("#player_cover_container").offset().left / -player_screen.offsetWidth);

    $(".player_cover_screen").removeClass("player_cover_screen_active");
    $(".player_cover_screen").eq(index).addClass("player_cover_screen_active");
    
}












// PROGRESS BAR
$(".progressTrack").on("touchstart", function(){
    progressIsPressed = true;
});


$(".progressTrack").on("touchend", function(){
    if ( progressIsPressed ){ 

        // Set Current Time
        const fillWidth = $(this).children(".progressFill").width() | 0;
        const total = $(this).width() | 0;
        const percent = fillWidth / total;
        audioManager.currentTime = percent * audioManager.duration;
    }
    progressIsPressed = false;
    toggleTimePressCurrent(false)
});


$(".progressTrack").on("touchmove", function(event){
    const total = $(this).width() | 0;
    const posX = Math.clamp(event.touches[0].clientX - $(this).offset().left, 0, total);
    const percent = posX / total;

    $(this).children(".progressFill").width(posX);
    setTimePressCurrent(percent * audioManager.duration);
    toggleTimePressCurrent(true);
});


$(".progressTrack").on("click", function(event){
    const posX = Math.clamp(event.clientX - $(this).offset().left, 0, $(this).width());
    $(this).children(".progressFill").width(posX);

    // Set Current Time
    const fillWidth = $(this).children(".progressFill").width() | 0;
    const total = $(this).width() | 0;
    const percent = fillWidth / total;
    audioManager.currentTime = percent * audioManager.duration;

});




 



function getSongInfoByPath( path ){

    for (const albumIndex in SONGDATABASE) {

        const element = SONGDATABASE[albumIndex];
        const song = element.songs.find(e => e.url == path);

        if ( song != null ){
            return {
                title: song.title,
                album: element.album,
                artist: element.artist,
                artwork: element.artwork,
                length: song.length,
                id: song.id,
                url: path
            };
        }
         
    }

    return null;

}




function getSongListByAlbumName( albumName ){
    const albumElement = SONGDATABASE.find(e => e.album == albumName);
    let songList = [];

    for (const key in albumElement.songs) {
        const element = albumElement.songs[key];
        
        songList.push({
            title: element.title,
            album: albumElement.album,
            artist: albumElement.artist,
            artwork: albumElement.artwork,
            length: element.length,
            id: element.id,
            url: element.url
        });
        
    }

    return songList;
}



function getSongListByArtistName( artistName ){
    const albumNames = getAlbumsNameByArtistName(artistName);
    const songList = albumNames.flatMap(e => getSongListByAlbumName(e));
    return songList;
}



function getSongListAll(){
    let songList = [];
    
    SONGDATABASE.forEach(e => {
        e.songs.forEach(song => {
            songList.push({
                title: song.title,
                album: e.album,
                artist: e.artist,
                artwork: e.artwork,
                url: song.url,
                length: song.length,
                id: song.id
            });
        });
    });

    return songList.sort((a, b) => a.title.localeCompare(b.title.toUpperCase()));

}



function getTimePlaylistBySongList( songList = [] ){
    return songList.reduce((a, b) => a + b.length, 0);
}







function getAlbumsNameByArtistName( artistName ){
    return SONGDATABASE.filter(e => e.artist == artistName).map(e => e.album).sort((a, b) => a.localeCompare(b.toUpperCase()));
}



function getAlbumsByArtistName( artistName ){
    return SONGDATABASE.filter(e => e.artist == artistName);
}




function getAllArtistNames(){
    return [...new Set(SONGDATABASE.map(e => e.artist))];
}






function getFolderByPath( path ){
    const temp = path.split("/");
    return temp.slice(0, temp.length - 1).join("/");
}


function getSongFileByPath( path ){
    const temp = path.split("/");
    return temp[ temp.length - 1 ];
}



function getFolderList(){
    const songList  = getSongListAll();
    const pathList  = songList.map(e => e.url);

    let folderList  = pathList.map(e => getFolderByPath(e) );
    folderList      = [...new Set(folderList)];
    folderList.sort((a, b) => a.localeCompare(b.toUpperCase()));

    folderList = folderList.map(e=> {
        return {name: e, songs: []}
    });

    pathList.forEach(e => {
        const currentFolder = getFolderByPath(e);
        const index = folderList.findIndex(el => el.name == currentFolder);

        if ( index >= 0 ){
            folderList[index].songs.push( getSongFileByPath(e) );
        }
    });

    return folderList;

}



function getSongListByFolderPath( currentPath = "root" ){
    const folderObject = getFolderList().find(e => e.name == currentPath);
    
    if ( folderObject == null ){
        return [];
    }

    return folderObject.songs.map(e => getSongInfoByPath(currentPath + '/' + e));
}












function appendSongListToPlayList( songList = [], isNext = false ){
    const isFirstTime = PLAYLIST.length == 0;

    if ( isNext ){
        PLAYLIST.splice(SONGINDEX+1, 0, ...songList);
    }else{
        PLAYLIST = PLAYLIST.concat(songList);
    }
    
    PLAYLIST_OLD = PLAYLIST_OLD.concat(songList);

    generatePlayListScreen();
    generateCoverSongs();
    $(".player_current_song").text(`${SONGINDEX+1}/${PLAYLIST.length}`);
    setPlayListDuration(getTimePlaylistBySongList(PLAYLIST.slice(SONGINDEX, PLAYLIST.length)), getTimePlaylistBySongList(PLAYLIST));

    if ( isFirstTime ){
        playSongByPlaylistIndex(0, true, false); 
    }

}




function clearPlayList(){

    SONGINDEX = -1;
    PLAYLIST = [];
    audioManager.src = '';
    selectSongByPath();

    showHiddenMoveableHeaderScreen($(player_screen), false, 0);
    toggleMoveableHeaderScreen($(playlist_screen), false);
    showHiddenMoveableHeaderScreen($(playlist_screen), false, 0);

}













/*
REPEATMODE type:
0: off
1: repeat
2: repeat one
*/

function setRepeatButton( type = 0 ){
    REPEATMODE = Math.clamp(type, 0, 2);
    $(".player_control_repeat").css('color', REPEATMODE != 0? "#fff" : "#616161");

    if ( REPEATMODE != 2 ){
        $(".player_control_repeat").html(`<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/></svg>`);
        return;
    }

    $(".player_control_repeat").html(`<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M460-360v-180h-60v-60h120v240h-60ZM280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z"/></svg>`);

}


function setShuffleButton( state = false ){
    SHUFFLEMODE = state;
    $(".player_control_shuffle").css('color', state? "#fff" : "#616161");
}


function setPlayPauseButton( state = false ){

    if ( state ){
        $(".screen_header_button_playPause").html(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`);
        $(".player_control_playPause").html(`<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M320-200v-560l440 280-440 280Z"></path></svg>`);
        return;
    }
    
    $(".screen_header_button_playPause").html(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5"/></svg>`);
    $(".player_control_playPause").html(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5"/></svg>`);
    
}


function setProgressBar( percent = 0 ){
    percent = Math.clamp(percent, 0, 100);
    $(".progressFill").width( percent * $(".progressTrack").width() / 100 );
}


function setSongContent(title, album, artist, artwork){
    $(".player_song_title").text(title);
    $(".player_song_artist").text(artist);
    $("#player_screen").find(".screen_header_front .screen_header_content_title").text(title);
    $("#player_screen").find(".screen_header_front .screen_header_content_subTitle").text(artist);
    $("#player_screen").find(".screen_header_back .screen_header_content_subTitle").text(album);

    if ( artwork != null ){
        $(".screen_header_cover_image").css("background-image", `url("${artwork}")`);
    }
}







$(".player_control_repeat").click(function(){
    setRepeatButton( (REPEATMODE + 1) % 3 );
});





$(".player_control_shuffle").click(function(){
    setShuffleButton( !SHUFFLEMODE );
    const currentSong = PLAYLIST[SONGINDEX];

    if ( SHUFFLEMODE ){
        PLAYLIST_OLD = JSON.parse( JSON.stringify(PLAYLIST) );
        PLAYLIST.splice(SONGINDEX, 1);
        shuffleArray(PLAYLIST);
        PLAYLIST.unshift(currentSong);
        SONGINDEX = PLAYLIST.findIndex(e => e.url == currentSong.url);
    }else{
        PLAYLIST  = JSON.parse( JSON.stringify(PLAYLIST_OLD) ); 
        SONGINDEX = PLAYLIST.findIndex(e => e.url == currentSong.url);
    }
    
    generatePlayListScreen();
    generateCoverSongs();
    $(".player_current_song").text(`${SONGINDEX+1}/${PLAYLIST.length}`);
    setPlayListDuration(getTimePlaylistBySongList(PLAYLIST.slice(SONGINDEX, PLAYLIST.length)), getTimePlaylistBySongList(PLAYLIST));

});








function timeFormatter( timeSeconds ){

    if ( timeSeconds == null || isNaN(timeSeconds) ){
        return '--:--';
    }

    timeSeconds = parseInt(timeSeconds);
    const h = parseInt( timeSeconds / 3600 );       // Hours
    const m = parseInt( timeSeconds / 60 % 60 );    // Minutes
    const s = timeSeconds % 60;                     // Seconds

    if ( h > 0 ){
        return `${h}:${String(m).padStart(2, 0)}:${String(s).padStart(2, 0)}`;
    }

    return `${m}:${String(s).padStart(2, 0)}`;
}


function timePlaylistFormatter( timeSeconds = 0 ){

    if ( timeSeconds >= 3600 ){
        return `${parseInt(timeSeconds/3600)}h ${parseInt(timeSeconds / 60 % 60)} min`;
    }

    if ( timeSeconds >= 60 ){
        return `${parseInt(timeSeconds / 60 % 60)} min`;
    }

    return `${timeSeconds} sec`;

}




function setSongTime(currentTime, duration){
    $(".player_current_time").text( timeFormatter(currentTime) );
    $(".player_duration_time").text( timeFormatter(duration) );
}






$(".carouselScreenContent").on("scroll", function(){
    
    if ( $(this).parent().find(".screenScroll").hasClass("screenScrollPressed") ){
        return;
    }

    const screenScrollThumb     = $(this).parent().find(".screenScrollThumb");
    const screenScrollSelector  = $(this).parent().find(".screenScrollSelector");
    const posY                  = $(this).scrollTop() ;
    const maxPosY               = $("#main_screen").height() - $("#main_screen .screen_header").height() - ($("#player_screen").height() - $("#player_screen").offset().top) - screenScrollThumb.height();
    const scrollHeight          = $(this)[0].scrollHeight - $(this).height() - $(this).offset().top;

    screenScrollSelector.css('top', -Math.clamp(posY, 0, screenScrollThumb.height() / 1) + 'px');
    screenScrollThumb.css('top', Math.clamp(map(posY, 0, scrollHeight, 0, maxPosY), 0, maxPosY) + 'px');

});






$(".screenScroll").on("touchmove", function(event){
    const carouselScreenContent = $(this).prev()[0];
    
    if ( !touchThreshold.y || carouselScreenContent.scrollHeight < carouselScreenContent.offsetHeight ){
        return;
    }

    const screenScrollThumb = $(this).find(".screenScrollThumb");
    const screenScrollSelector = $(this).find(".screenScrollSelector");
    let posY = event.touches[0].clientY - $(this).offset().top - screenScrollThumb.height() / 2;

    if ( $(this).parent().hasClass("carouselScreen") ){        
        const maxPosY = $("#main_screen").height() - $("#main_screen .screen_header").height() - ($("#player_screen").height() - $("#player_screen").offset().top) - screenScrollThumb.height();
        posY = Math.clamp(posY, 0, maxPosY);
        const percent = posY / maxPosY;

        try{
            const toIndex = parseInt( percent / (1 / ($(carouselScreenContent).find('.itemList').length - 1) ) );
            const letter = $(carouselScreenContent).find('.itemList').eq(toIndex).find('.itemListContentTitle').text()[0].toUpperCase();
            screenScrollSelector.text(letter);
            carouselScreenContent.scrollTop = toIndex * 56;
            screenScrollSelector.css('visibility', 'visible');
        }catch(e){
            carouselScreenContent.scrollTop = percent * (carouselScreenContent.scrollHeight - carouselScreenContent.offsetHeight); 
            screenScrollSelector.css('visibility', '');
        }

    }

    screenScrollSelector.css('top', -Math.clamp(posY, 0, screenScrollThumb.height() / 2) + 'px');
    screenScrollThumb.css('top', posY + 'px');

});


$(".screenScroll").on("touchstart", function(){
    $(this).addClass("screenScrollPressed");
});


$(".screenScroll").on('touchend', function(){
    const screenScrollSelector = $(this).find(".screenScrollSelector");
    screenScrollSelector.css('visibility', '');
    $(this).removeClass("screenScrollPressed");
});

 














function setItemData(itemElement, songTitle, songAlbum, songArtist, songPath){
    if ( songTitle ) itemElement.setAttribute('title', songTitle);
    if ( songAlbum ) itemElement.setAttribute('album', songAlbum);
    if ( songArtist ) itemElement.setAttribute('artist', songArtist);
    if ( songPath ) itemElement.setAttribute('path', songPath);
}



function createItemListElement(parentElement, title, subTitle, imageURL, isFolder = false, hasIcon = true ){

    const element = document.createElement('div');
    element.classList.add('itemList');
    element.classList.toggle('itemListFolder', isFolder);

    element.innerHTML = `
    <div class="itemListBox itemListBoxRounded itemListBoxImage"></div>
    <div class="itemListContent">
        <div class="itemListContentTitle">${title}</div>
        <div class="itemListContentSubTitle">${subTitle}</div>
    </div>
    <div class="itemListBox itemListBoxOption">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/></svg>
    </div>`;

    if ( imageURL != null ){

        if ( hasIcon ){
            $(element).find(".itemListBox").first().css('background-image', `url("${imageURL}")`);
        }else{
            $(element).find(".itemListBox").first().css('background-image', 'none');
            $(element).find(".itemListBox").first().text(imageURL);
        }
    }
    
    if ( isFolder ){
        $(element).find(".itemListBox").first().css('background-image', 'none');
        $(element).find(".itemListBox").first().html(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#FFEB3B" viewBox="0 0 16 16"><path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a2 2 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3m-8.322.12q.322-.119.684-.12h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981z"/></svg>`);
    }

    $(parentElement).append(element);

    return element;
    
}




function createItemGridAlbumElement(parentElement, title, subTitle, imageURL){
    const element = document.createElement('div');
    element.classList.add('itemGrid');

    element.innerHTML = `
    <div class="itemGridImage"></div>
    <div class="itemGridContentWrapper">
        <div class="itemGridContent">
            <div class="itemGridTitle">${title}</div>
            <div class="itemGridSubTitle">${subTitle}</div>
        </div>
        <div class="itemGridButton">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/></svg>
        </div>
    </div>`;

    if ( imageURL != null ){
        $(element).find(".itemGridImage").css('background-image', `url("${imageURL}")`);
    }

    $(parentElement).append(element);

    $(".itemGridImage").css("height", $(".itemGridImage").width() + 'px');

    return element;

}




function createItemGridArtistElement(parentElement, title, subTitle, imageListURL = []){
    const element = document.createElement('div');
    element.classList.add('itemGrid', 'itemGridRounded');
    
    element.innerHTML = `
    <div class="itemGridImage"></div>
    
    <div class="itemGridContentWrapper">
        <div class="itemGridContent">
            <div class="itemGridTitle">${title}</div>
            <div class="itemGridSubTitle">${subTitle}</div>
        </div>
    </div>`;

    let amount = 1;

    if ( imageListURL.length >= 4 ){
        $(element).find(".itemGridImage").addClass("itemGridImageMultiple");
        amount = 4;
    }else if ( imageListURL.length == 2 ){
        $(element).find(".itemGridImage").addClass("itemGridImageDual");
        amount = 2;
    }

    for (let i = 0; i < amount; i++){
        const itemGridImageItem = document.createElement('div');
        itemGridImageItem.classList.add('itemGridImageItem');
        itemGridImageItem.style.backgroundImage = `url("${imageListURL[i]}")`;
        $(element).find(".itemGridImage").append(itemGridImageItem);
    }

    $(parentElement).append(element);
    $(".itemGridImage").css("height", $(".itemGridImage").width() + 'px');

    return element;

}






function toggleScreen(element, state, delayMiliseconds = 100){
    $(element).css('transition', delayMiliseconds + 'ms');
    $(element).css('transform', state ? 'translateY(0px)' : 'translateY(100%)');
    $(element).css('opacity', state | 0 );
    
    if ( state ){
        $(element).css('transform', '');
    }

    $(element).toggleClass('screenOpened', false);
    $(element).toggleClass('screenOpened', true);

    if ( PLAYLIST[SONGINDEX] != null ){
        selectSongByPath( PLAYLIST[SONGINDEX].url );
    }

}






$("#album_screen .screen_content").on("scroll", function(event){
    const posY = $(this)[0].scrollTop;
    const max  = $(albumScreenCover).height() - $("#album_screen .headBar").height();
    const percent = Math.clamp(posY / max, 0, 1);
    $("#album_screen .headBar").css('background-color', `rgba(33, 33, 33, ${percent})`);
    $("#album_screen .headBar").css('box-shadow', percent == 1 ? '0 0 5px 0 #000' : '');

    $("#album_screen .headBarLabel").css('opacity', percent);
});


$("#artist_screen .screen_content").on("scroll", function(event){
    const posY = $(this)[0].scrollTop;
    const max  = $(albumScreenCover).height() - $("#artist_screen .headBar").height();
    const percent = Math.clamp(posY / max, 0, 1);
    $("#artist_screen .headBar").css('background-color', `rgba(33, 33, 33, ${percent})`);
    $("#artist_screen .headBar").css('box-shadow', percent == 1 ? '0 0 5px 0 #000' : '');

    $("#artist_screen .headBarLabel").css('opacity', percent);
});






function generateAlbumScreen( songList = [] ){
    $("#album_screen .screen_content")[0].scrollTop = 0;

    $(albumScreenName).text(songList[0].album);
    $("#album_screen .headBarLabel").text(songList[0].album);

    $(albumScreenDualContentLeft).text(songList.length + ' faixas');
    $(albumScreenDualContentRight).text( timePlaylistFormatter(getTimePlaylistBySongList(songList)) );
 
    $(albumContentList).empty();

    $(albumScreenCover).css("background-image", `url("${songList[0].artwork}")`)

    songList.forEach((e, i) => {
        setItemData(
            createItemListElement($(albumContentList), e.title, `${timeFormatter(e.length)} • ${e.artist}`, i+1, false, false),
            e.title,
            e.album,
            e.artist,
            e.url);
    });


    toggleScreen(album_screen, true, 500);

}








function generateArtistScreen( albumList = [] ){
    $("#artist_screen .screen_content")[0].scrollTop = 0;
    
    $(artistScreenName).text(albumList[0].artist);
    $("#artist_screen .headBarLabel").text(albumList[0].artist);
    
    $(artistScreenHorizontalAlbumList).empty();
    $(aristScreenSongList).empty();

    let totalTime   = 0;
    let amountSongs = 0;

    albumList.forEach(albumElement => {
        const songList = albumElement.songs.sort((a, b) => a.id - b.id );
        amountSongs += songList.length;

        // ALBUM
        setItemData(
            createItemGridAlbumElement($(artistScreenHorizontalAlbumList), albumElement.album, albumElement.artist, albumElement.artwork),
            null,
            albumElement.album,
            albumElement.artist);
        
        
        // SONGS From ALBUM
        songList.forEach(e => {
            totalTime += e.length;

            setItemData(
                createItemListElement($(aristScreenSongList), e.title, `${timeFormatter(e.length)} • ${albumElement.artist}`, albumElement.artwork, false),
                e.title,
                albumElement.album,
                albumElement.artist,
                e.url);
        });

    });


    $(artistScreenInfo).text(`${albumList.length} álbuns • ${amountSongs} faixas • ${timePlaylistFormatter(totalTime)}`);
    toggleScreen(artist_screen, true, 500);

}










function generateAllSongItemList(){
    const songList = getSongListAll(); 

    $(carouselScreenSongs).find(".carouselScreenContent").empty();

    songList.forEach(e => {
        setItemData(
            createItemListElement($(carouselScreenSongs).find(".carouselScreenContent"), e.title, `${timeFormatter(e.length)} • ${e.artist}`, e.artwork, false),
            e.title,
            e.album,
            e.artist,
            e.url);
    });

}







function generateAlbumsItemGrid(){
    const albumList = JSON.parse( JSON.stringify(SONGDATABASE) ).sort((a, b) => a.album.localeCompare(b.album.toUpperCase()));
    $(carouselScreenAlbums).find(".carouselScreenContentGrid").empty();

    albumList.forEach(e => {
        setItemData(
            createItemGridAlbumElement($(carouselScreenAlbums).find(".carouselScreenContentGrid"), e.album, e.artist, e.artwork), 
            null,
            e.album,
            e.artist);
    });

}









function generateArtistsItemGrid(){
    $(carouselScreenArtists).find(".carouselScreenContentGrid").empty();
    const artistList = getAllArtistNames();

    artistList.forEach(artistName => {

        const albumList = getAlbumsByArtistName(artistName);
        const amountAlbumns = albumList.length;
        const amountSongs = [].concat(...albumList.map(e => e.songs)).length;
        const artworkList = albumList.map(e => e.artwork);

        setItemData(
            createItemGridArtistElement( $(carouselScreenArtists).find(".carouselScreenContentGrid"), artistName, `${amountSongs} faixas ${amountAlbumns} álbuns`, artworkList ),
            null,
            null,
            artistName,
            null
        );

    });

}








function generateFolderFilesItemList( currentPath = "root" ){

    const folderList = getFolderList();
    $(folderScreenItemList).empty();

    if ( currentPath == "root" ){
        $(breadCrumb).text(currentPath);

        folderList.forEach(e => {
            const folderName = e.name.slice( e.name.lastIndexOf('/') + 1 );

            setItemData(
                createItemListElement($(folderScreenItemList), folderName, `${e.songs.length} faixas`, null, true),
                null,
                null,
                null,
                e.name);
        });

    }


    const folderObject = folderList.find(e => e.name == currentPath);
    
    if ( folderObject != null ){
        $(breadCrumb).text(currentPath);
        const songList = getSongListByFolderPath(currentPath);

        songList.forEach(e => {
            setItemData(
                createItemListElement($(folderScreenItemList), e.title, `${timeFormatter(e.length)} • ${e.artist}`, e.artwork, false),
                e.title,
                e.album,
                e.artist,
                e.url);
        });

    }


    if ( PLAYLIST[SONGINDEX] != null ){
        selectSongByPath( PLAYLIST[SONGINDEX].url );
    }


}












function generateSearchScreenByQuery( searchQuery = '' ){
    $(".searResultContent").empty();
    
    if ( searchQuery == '' || searchQuery == null ){
        return;
    }

    searchQuery             = searchQuery.toUpperCase();
    const songList          = getSongListAll().filter(e => e.title.toUpperCase().indexOf(searchQuery) >= 0 );
    const albumList         = SONGDATABASE.filter(e => e.album.toUpperCase().indexOf(searchQuery) >= 0 );
    const artistListNames   = [...new Set(SONGDATABASE.filter(e => e.artist.toUpperCase().indexOf(searchQuery) >= 0 ).map(e => e.artist))].sort((a, b) => a.localeCompare(b.toUpperCase()));
    const artistListAlbums  = artistListNames.map(e => getAlbumsByArtistName(e));
    const favoriteSongList  = FAVORITES.map(e => getSongInfoByPath(e)).filter(e => e.title.toUpperCase().indexOf(searchQuery) >= 0 ).sort((a, b) => a.title.localeCompare(b.title.toUpperCase()));;

    
    albumList.forEach(e => {
        setItemData(
            createItemGridAlbumElement($(search_result_album).find(".searResultContent"), e.album, e.artist, e.artwork), 
            null,
            e.album,
            e.artist);
    });
    
   
    artistListAlbums.forEach(e => {
        const amountAlbumns = e.length;
        const amountSongs = e.flatMap(e => e.songs).length;
        const artworkList = e.map(el => el.artwork);
        const artistName = e[0].artist; 

        setItemData(
            createItemGridArtistElement( $(search_result_artist).find(".searResultContent"), artistName, `${amountSongs} faixas ${amountAlbumns} álbuns`, artworkList ),
            null,
            null,
            artistName,
            null
        );

    });

    
    favoriteSongList.forEach(e => {
        setItemData(
            createItemListElement($(search_result_favorite).find(".searResultContent"), e.title, `${timeFormatter(e.length)} • ${e.artist}`, e.artwork, false),
            e.title,
            e.album,
            e.artist,
            e.url);
    });


    songList.forEach(e => {
        setItemData(
            createItemListElement($(search_result_track).find(".searResultContent"), e.title, `${timeFormatter(e.length)} • ${e.artist}`, e.artwork, false),
            e.title,
            e.album,
            e.artist,
            e.url);
    });


    if ( PLAYLIST[SONGINDEX] != null ){
        selectSongByPath( PLAYLIST[SONGINDEX].url );
    }

}




searchInput.oninput = () => {
    searchInput.value = searchInput.value.trimStart();
    generateSearchScreenByQuery( searchInput.value );
    
    if ( searchInput.value.length > 0 ){
        $(searchInputClear).html(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"  viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>`);
        return;
    }
    
    $(searchInputClear).html(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"></path></svg>`);
    
};


$(searchInputClear).click(function(){
    $(searchInputClear).html(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"></path></svg>`);
    searchInput.value = '';
    $(".searResultContent").empty();
    searchInput.focus();
});




function onSeachScreenClose(){
    searchInput.blur();
    toggleScreen(search_screen, false, 100);
    $(".searResultContent").empty();

    $(album_screen).css('z-index', '');
    $(artist_screen).css('z-index', '');
    $(player_screen).css('z-index', '');
    $(playlist_screen).css('z-index', '');
}



function onSeachScreenCloseOpen(){
    searchInput.value = '';
    $(".searResultContent").empty();
    toggleScreen(search_screen, true, 50);
    searchInput.focus();

    $(artist_screen).css('z-index', '1');
    $(album_screen).css('z-index', '2');
    $(player_screen).css('z-index', '3');
    $(playlist_screen).css('z-index', '4');
}







$(mainScreenOptionIcon).click(function(){

    generatePopupMenu([
        {label: "Sobre", callback: () => {
            alert("Sobre: music player");
        }}
    ]);

    movePopupMenuToOptionButton( $(this).children().first() );

});








function selectSongByPath( path ){
    $(".itemListSelected").removeClass("itemListSelected");
    $(`.itemList[path="${path}"]`).addClass("itemListSelected");

    $("#playlist_screen .itemListSelected").removeClass("itemListSelected");

    if ( SONGINDEX >= 0 ){
        $("#playlist_screen .itemList").eq(SONGINDEX).addClass("itemListSelected");
    }
}











function generatePlayListScreen(){

    $("#playlist_screen .screen_content").empty();


    PLAYLIST.forEach(e => {

        const element = document.createElement('div');
        element.classList.add('itemList');

        element.innerHTML = `
        <div class="itemListBox itemListBoxRounded itemListBoxImage"></div>
        <div class="itemListContent">
            <div class="itemListContentTitle">${e.title}</div>
            <div class="itemListContentSubTitle">${timeFormatter(e.length)} • ${e.artist}</div>
        </div>
        <div class="itemListBox itemListBoxSorter">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"></path></svg>
        </div>`;


        $(element).find(".itemListBox").first().css('background-image', `url("${e.artwork}")`);
        setItemData(element, e.title, e.album, e.artist, e.url);
        $("#playlist_screen .screen_content").append(element);

    });


    if ( PLAYLIST[SONGINDEX] != null ){
        selectSongByPath( PLAYLIST[SONGINDEX].url );
    }


}






function setPlayListDuration( remains = 0, total = 0 ){
    $(".playlistDurationRemains").text( timeFormatter(remains) );
    $(".playlistDurationTotal").text( timeFormatter(total) );
}






function setPlayerScreenHeartState( state = false ){
    $(player_screen).find(".heartButton").toggleClass("heartButtonActive", state);
}










// ALBUM PLAY BUTTON CLICK
$(albumScreenCoverButton).click(function(){
    PLAYLIST = getSongListByAlbumName(albumContentList.firstElementChild.attributes['album'].textContent);
    generatePlayListScreen();
    playSongByPlaylistIndex(0, true);
});


// ALBUM SONG CLICK
$(albumContentList).on("click", ".itemList", function(){
    PLAYLIST = getSongListByAlbumName(albumContentList.firstElementChild.attributes['album'].textContent);
    generatePlayListScreen();
    playSongByPlaylistIndex( $(this).index(), true );
});


// ALBUM SONG OPTION CLICK
$(albumContentList).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    console.log('album song option clicked');
    
    const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            PLAYLIST = getSongListByAlbumName(albumContentList.firstElementChild.attributes['album'].textContent);
            generatePlayListScreen();
            playSongByPlaylistIndex( $(this).parent().index(), true );
        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], false);
        }}
    ]);

    movePopupMenuToOptionButton($(this));
});






// MAIN SONG CLICK
$(carouselScreenSongs).on("click", ".itemList", function(){
    PLAYLIST = getSongListAll();
    generatePlayListScreen();
    playSongByPlaylistIndex( $(this).index(), true );
});


// MAIN SONG OPTION CLICK
$(carouselScreenSongs).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    console.log('song option clicked');

    const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            PLAYLIST = getSongListAll();
            generatePlayListScreen();
            playSongByPlaylistIndex( $(this).parent().index(), true );
        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], false);
        }}
    ]);

    movePopupMenuToOptionButton($(this));
});








function onAlbumClick( element ){
    const albumList = getSongListByAlbumName(element[0].attributes['album'].textContent);
    console.log('album clicked', albumList); 
    generateAlbumScreen(albumList);
}


function onAlbumOptionClick( element ){
    console.log('album option clicked');

    const albumList = getSongListByAlbumName( element.parent().parent().attr('album') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            PLAYLIST = albumList;
            generatePlayListScreen();
            playSongByPlaylistIndex(0, true );
        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList(albumList, true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList(albumList, false);
        }}
    ]);

    movePopupMenuToOptionButton(element);
}





// MAIN ALBUM CLICK
$(carouselScreenAlbums).on("click", ".itemGrid", function(){
    onAlbumClick( $(this) );
});


// MAIN ALBUM OPTION CLICK
$(carouselScreenAlbums).on("click", ".itemGridButton", function(event){
    event.stopPropagation();
    onAlbumOptionClick( $(this) );
});


// ALBUM CLICK IN ARTIST SCREEN
$(artistScreenHorizontalAlbumList).on("click", ".itemGrid", function(){
    onAlbumClick( $(this) );
});


// ALBUM OPTION CLICK IN ARTIST SCREEN
$(artistScreenHorizontalAlbumList).on("click", ".itemGridButton", function(event){
    event.stopPropagation();
    onAlbumOptionClick( $(this) );
});



// SEARCH ALBUM CLICK
$(search_result_album).on("click", ".itemGrid", function(){ 
    onAlbumClick( $(this) );
});


// SEARCH ALBUM OPTION CLICK
$(search_result_album).on("click", ".itemGridButton", function(event){
    event.stopPropagation();
    onAlbumOptionClick( $(this) ); 
});









function onArtistClick( element ){
    const albumListByArtist = getAlbumsByArtistName(element[0].attributes['artist'].textContent);
    console.log('artist clicked', albumListByArtist);
    generateArtistScreen(albumListByArtist);
}



// MAIN ARTIST CLICK
$(carouselScreenArtists).on("click", ".itemGrid", function(){
    onArtistClick( $(this) );
});


// SEARCH ARTIST CLICK
$(search_result_artist).on("click", ".itemGrid", function(){
    onArtistClick( $(this) );
});







// SEACH SONG CLICK
$(search_screen).on("click", ".itemList", function(){
    const currentClickedSong = getSongInfoByPath( $(this).attr('path') );
    appendSongListToPlayList([currentClickedSong], true);
     
    if ( SONGINDEX + 1 < PLAYLIST.length ){
        SONGINDEX++;
    }

    playSongByPlaylistIndex(SONGINDEX, true, true);

});


// SEACH SONG OPTION CLICK
$(search_screen).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    console.log('search song option clicked');
    const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);

            if ( SONGINDEX + 1 < PLAYLIST.length ){
                SONGINDEX++;
            }

            playSongByPlaylistIndex(SONGINDEX, true, true);

        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], false);
        }}
    ]);

    movePopupMenuToOptionButton($(this));
});














// BREAD CRUM CLICK (GO TO PARENT FODLER);
$(breadCrumb).click(function(){
    let parentPath = $(breadCrumb).text().split("/");
    parentPath = parentPath[ parentPath.length - 2 ];
    generateFolderFilesItemList(parentPath);
});



// MAIN FOLDER/SONG CLICK
$(carouselScreenFolders).on("click", ".itemList", function(){
    const isFolder = $(this).hasClass("itemListFolder");

    if ( isFolder ){
        console.log('song/folder FOLDER clicked', $(this).attr('path'));
        generateFolderFilesItemList( $(this).attr('path') );
        return;
    }

    console.log('song/folder SONG clicked');

    const index = $(this).index() - $(folderScreenItemList).find(".itemListFolder").length;
    PLAYLIST = getSongListByFolderPath( $(breadCrumb).text() );
    generatePlayListScreen();
    playSongByPlaylistIndex(index, true);

});


// MAIN FOLDER/SONG OPTION CLICK
$(carouselScreenFolders).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    const isFolder = $(this).parent(".itemList").hasClass("itemListFolder");

    if ( isFolder ){
        console.log('song/folder FOLDER option clicked');
        
        const folderSongList = getSongListByFolderPath( $(breadCrumb).text() + '/' + $(this).parent().find(".itemListContentTitle").text() );

        generatePopupMenu([
            {label: 'Reproduzir', callback: ()=>{
                PLAYLIST = folderSongList;
                generatePlayListScreen();
                playSongByPlaylistIndex(0, true );
            }},

            {label: 'Reproduzir a Seguir', callback: ()=>{
                appendSongListToPlayList(folderSongList, true);
            }},

            {label: 'Adicionar à fila', callback: ()=>{
                appendSongListToPlayList(folderSongList, false);
            }}
        ]);


    }else{
        console.log('song/folder SONG option clicked');

        const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

        generatePopupMenu([
            {label: 'Reproduzir', callback: ()=>{
                PLAYLIST = getSongListByFolderPath( $(breadCrumb).text() );
                generatePlayListScreen();
                playSongByPlaylistIndex( $(this).parent().index(), true );
            }},

            {label: 'Reproduzir a Seguir', callback: ()=>{
                appendSongListToPlayList([currentClickedSong], true);
            }},

            {label: 'Adicionar à fila', callback: ()=>{
                appendSongListToPlayList([currentClickedSong], false);
            }}
        ]);

    }


    movePopupMenuToOptionButton($(this));

});









// FAVORITE SONG CLICK
$(carouselScreenFavorites).on("click", ".itemList", function(){
    PLAYLIST = FAVORITES.map(e => getSongInfoByPath(e));
    generatePlayListScreen();
    playSongByPlaylistIndex( $(this).index(), true );
    console.log("favorite song click");
});

// FAVORITE SONG OPTION CLICK
$(carouselScreenFavorites).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    console.log('favorite song option clicked');

    const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            PLAYLIST = FAVORITES.map(e => getSongInfoByPath(e));
            generatePlayListScreen();
            playSongByPlaylistIndex( $(this).parent().index(), true );
        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], false);
        }}
    ]);

    movePopupMenuToOptionButton($(this));
});







 


















// SONG CLICK IN ARTIST SCREEN 
$(aristScreenSongList).on("click", ".itemList", function(){ 
    PLAYLIST = getSongListByArtistName($(this)[0].attributes['artist'].textContent);
    generatePlayListScreen();
    playSongByPlaylistIndex( $(this).index(), true );
});


// SONG OPTION CLICK IN ARTIST SCREEN 
$(aristScreenSongList).on("click", ".itemListBoxOption", function(event){
    event.stopPropagation();
    console.log('song/artist option clicked');

    const currentClickedSong = getSongInfoByPath( $(this).parent().attr('path') );

    generatePopupMenu([
        {label: 'Reproduzir', callback: ()=>{
            PLAYLIST = getSongListByArtistName( $(this).parent().attr('artist') );
            generatePlayListScreen();
            playSongByPlaylistIndex( $(this).parent().index(), true );
        }},

        {label: 'Reproduzir a Seguir', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], true);
        }},

        {label: 'Adicionar à fila', callback: ()=>{
            appendSongListToPlayList([currentClickedSong], false);
        }}
    ]);

    movePopupMenuToOptionButton($(this));
});










// SONG CLICK IN PLAYLIST SCREEN
$(playlist_screen).on("click", ".itemList", function(){
    console.log("PLAYLIST ITEM CLICK", $(this).index());
    playSongByPlaylistIndex( $(this).index(), true );
});




// SONG SWIPE DELETE IN PLAYLIST SCREEN
$(playlist_screen).on("touchmove", ".itemList", function(event){
    
    if ( !touchThreshold.x ){
        return;
    }

    console.log("move swipe");
    const posX = event.touches[0].clientX - screenTouchInit.x;
    $(this).css("transition", "");
    $(this).css("transform", `translateX(${posX}px)`);

});



// RELEASE SONG SWIPE DELETE IN PLAYLIST SCREEN
$(playlist_screen).on("touchend", ".itemList", function(){

    playlistItemPressedIndex = -1;
    $(this).css("transition", `100ms`);

    if ( Math.abs($(this).offset().left) > 0.5 * $(this).width() ){
        const isLeft = $(this).offset().left < 0;
        $(this).css("transform", `translateX(${isLeft? -100 : 200}%)`);
        
        setTimeout(()=>{

            if ( PLAYLIST.length > 1 ){
                $(this).hide(100, function(){
                    setTimeout(()=>{
                        console.warn("DELETE PLAYLIST INDEX", $(this).index());
                        PLAYLIST.splice($(this).index(), 1);
                        const isCurrentSongDeleted = $(this).index() == SONGINDEX;

                        if ( $(this).index() < SONGINDEX ){
                            SONGINDEX--;
                        }else if ( isCurrentSongDeleted ){
                            SONGINDEX = Math.clamp(SONGINDEX, 0, PLAYLIST.length-1);
                        }

                        $(this).remove();
                        $(".player_current_song").text(`${SONGINDEX+1}/${PLAYLIST.length}`);
                        generateCoverSongs();
                        setPlayListDuration(getTimePlaylistBySongList(PLAYLIST.slice(SONGINDEX, PLAYLIST.length)), getTimePlaylistBySongList(PLAYLIST));
                        
                        if ( isCurrentSongDeleted ){
                            playSongByPlaylistIndex(SONGINDEX);
                        }

                    }, 1);
                });

            }else{
                $(this).css("transform", `translateX(0px)`);
            }

        }, 100);

    }else{
        $(this).css("transform", `translateX(0px)`);
    }

    

});






// CURRENT PRESSED INDEX IN PLAYLIST SCREEN
let playlistItemPressedIndex = -1;


$(playlist_screen).on("touchstart", ".itemList", function(event){
    playlistItemPressedIndex = $(this).index();
});




$(playlist_screen).on("click", ".itemListBoxSorter", function(event){
    event.stopPropagation();
});





// SONG SORT IN PLAYLIST SCREEN
$(playlist_screen).on("touchmove", ".itemListBoxSorter", function(event){

    if ( !touchThreshold.y ){
        return;
    }
    
    const itemListElement   = $(this).parent();
    const posY              = Math.clamp(event.touches[0].clientY - screenTouchInit.y, -56 * playlistItemPressedIndex, 56 * ($(playlist_screen).find(".itemList").length - playlistItemPressedIndex - 1) );
    const selectedIndex     = Math.clamp(Math.abs(parseInt(posY / 56)), 0, $(playlist_screen).find(".itemList").length - 1); 

    itemListElement.css("transform", `translateY(${posY}px)`);
    itemListElement.addClass("itemListPressed");

    for (let i = 0; i < $(playlist_screen).find(".itemList").length; i++){

        if ( i == playlistItemPressedIndex ){
            continue;
        }

        if ( posY <= 0 ){
            $($(playlist_screen).find(".itemList")[i]).css("transform", `translateY(${0}px)`);
            continue;
        }

        if ( posY + playlistItemPressedIndex * 56 >= 56 * i ){
            const offsetY = playlistItemPressedIndex < i ? -56 : 0;
            $($(playlist_screen).find(".itemList")[i]).css("transform", `translateY(${offsetY}px)`);
            continue;
        }

        $($(playlist_screen).find(".itemList")[selectedIndex + playlistItemPressedIndex + 1]).css("transform", `translateY(${-posY + (selectedIndex * 56)}px)`);

    }
    

    if ( posY >= 0 ){
        return;
    }
    

    for (let i = playlistItemPressedIndex - 1; i >= 0; i--){
            
        if ( i < playlistItemPressedIndex - selectedIndex ){
            $($(playlist_screen).find(".itemList")[playlistItemPressedIndex - selectedIndex - 1]).css("transform", `translateY(${-posY + (selectedIndex * -56)}px)`);
            continue;
        }
        
        $($(playlist_screen).find(".itemList")[i]).css("transform", `translateY(${56}px)`);
        
    }


});


 
$(playlist_screen).on("touchstart", ".itemListBoxSorter", function(event){
    $("#playlist_screen .screen_content").css("overflow", 'hidden');
});


// RELEASE SONG SORT IN PLAYLIST SCREEN
$(playlist_screen).on("touchend", ".itemListBoxSorter", function(event){
    event.stopPropagation();

    const scrollPosition     = $("#playlist_screen .screen_content").scrollTop();
    const itemListElement    = $(this).parent();
    const posY               = itemListElement.offset().top - 32 + scrollPosition;
    const newIndex           = Math.clamp(Math.round(posY / 56), 0, $(playlist_screen).find(".itemList").length - 1);
    const newItemListElement = $(playlist_screen).find(".itemList").eq(newIndex);

    console.warn("RELEASE SORT", playlistItemPressedIndex, newIndex, playlistItemPressedIndex - newIndex);

    $(playlist_screen).find(".itemList").css("transition", "");
    
    const tempSong = PLAYLIST[playlistItemPressedIndex];
    PLAYLIST.splice(playlistItemPressedIndex, 1);
    PLAYLIST.splice(newIndex, 0, tempSong);
    

    if ( playlistItemPressedIndex != newIndex ){

        if ( (playlistItemPressedIndex > newIndex) == (newIndex == $(playlist_screen).find(".itemList").length) ){
            itemListElement.insertAfter( newItemListElement ); 
        }else{
            itemListElement.insertBefore( newItemListElement ); 
        }
    }
    

    SONGINDEX = $("#playlist_screen .itemListSelected").index();
    $(".player_current_song").text(`${SONGINDEX+1}/${PLAYLIST.length}`);
    setPlayListDuration(getTimePlaylistBySongList(PLAYLIST.slice(SONGINDEX, PLAYLIST.length)), getTimePlaylistBySongList(PLAYLIST));

    generateCoverSongs();
    $(playlist_screen).find(".itemList").css("transform", `translateY(${0}px)`);
    itemListElement.removeClass("itemListPressed");
    playlistItemPressedIndex = -1;

    $("#playlist_screen .screen_content").css("overflow", '');

});


 

$("#playlist_screen .screen_content").on("scroll", function(event){
    touchThreshold.x = false;
    touchThreshold.y = false;
    $(playlist_screen).find(".itemList").css("transform", '');
});




onresize = () => {
    generateAlbumsItemGrid();
    generateArtistsItemGrid(); 
    
    $("#albumScreenCover").css("height", $("#albumScreenCover").width());
    $("#artistScreenCover").css("height", $("#artistScreenCover").width());

    const SELECTED_TAB_INDEX = $(".tabMenuItem").index($(".tabMenuItemSelected"));
    selectTabMenuByIndex(SELECTED_TAB_INDEX);
    moveCarouselScreenByIndex(mainScreenCarousel, SELECTED_TAB_INDEX, 0);

};


onload = () => {
    navigator.mediaSession.setActionHandler("play", play);
    navigator.mediaSession.setActionHandler("pause", pause);

    selectTabMenuByIndex(0);
    
    toggleScreen(album_screen, false, 0);
    toggleScreen(artist_screen, false, 0);
    showHiddenMoveableHeaderScreen($(player_screen), false, 0);
    
    setShuffleButton(false);
    setRepeatButton(0);
    
    toggleTimePressCurrent(false);
    togglePopupMenu(false);
    onSeachScreenClose();

    $("body").css("visibility", "visible");
    
    generateAllSongItemList();
    generateAlbumsItemGrid();
    generateArtistsItemGrid();
    generateFolderFilesItemList();
    generateFavoritesItemList();
    
    $("#albumScreenCover").css("height", $("#albumScreenCover").width());
    $("#artistScreenCover").css("height", $("#artistScreenCover").width());

};
