var App = App || {};

App.settings = {
    'allColors':    ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"],
    'colors':       6,
    'holes':        4,
    'guesses':      10,
    'duplicates':   true,
    'load': function () {
        // load saved settings (e.g. '6,4,10,true') from cookie
        var settings = GetCookie('settings');

        if (settings) {
            settings = settings.split(',');
            console.log('settings set to: ' + settings);

            App.settings = $.extend(App.settings, {
                'colors': parseInt(settings[0], 10),
                'holes': parseInt(settings[1], 10),
                'guesses': parseInt(settings[2], 10),
                'duplicates': (settings[3] === 'true')
            });
        } else {
            console.log('No settings stored in cookies.');
        }
    }
};

App.game = {
    'solution':       [], // the sequence that the player is trying to guess
    'guess':          [], // the player's guess
    'round':          0
};

App.timer = (function () {
    var obj = {},
        startTime = 0,
        paused = false,
        pauseStart = 0,
        pauseLength = 0;

    obj.start = function () {
        startTime = Date.now();
    };

    obj.pause = function () {
        if (startTime > 0 && !paused) {
            pauseStart = Date.now();
            $('#game_board').addClass('paused');
            paused = true;
            console.log('The timer is paused.');
        } else {
            console.log("Can't pause because either the game is not running or the game is already paused.");
        }
    };

    obj.resume = function () {
        if (paused) {
            pauseLength += Date.now() - pauseStart;
            $('#game_board').removeClass('paused');
            paused = false;
            console.log("Resuming. Paused for " + pauseLength + "ms.");
        } else {
            console.log("Not resuming because the game wasn't paused.");
        }
    };

    obj.getElapsedTime = function () {
        return Date.now() - startTime - pauseLength;
    };

    return obj;
}());


var tempNumberOfColors,
    tempNumberOfHoles,
    tempNumberOfGuesses;

$(document).ready(function() {
    var urlHash = self.document.location.hash.substring(1);
    App.settings.load();
    // If a game is defined in the url, get the game from the server
    if (urlHash != '') {
        RetrievePattern(urlHash);
    }
    // If no game is defined, continue building a random game
    else {
        console.log('No game was defined; building a random one instead.');
        BuildGame();
        StartGame();
    }
});
function BuildGame()
{
    InitializeVariables();
    BuildBoard();
    BuildColorPicker();
    BuildPreferences();
}
function StartGame(game)
{
    var d = new Date();
    ChooseNewPattern(game);
    StartNewRound();
    App.timer.start();
}
function ResetBoard()
{
    self.document.location.hash = '';
    $('#game_board').removeClass('paused');
    $('#game_board').empty();
    $('#color_chooser').empty();
    $('#color_chooser .marble').unbind('click').unbind('dblclick');
    BuildGame();
}
function ResetGame()
{
    self.document.location.hash = '';
    InitializeVariables();
    $('.display_correct .black').removeClass('black');
    $('.display_correct .white').removeClass('white');
    $('#game_board .holder').children('.marble').remove();
}
/**************************************
 *          Utility Functions         *
 **************************************/

/****** Build Game Helpers *****/
function InitializeVariables()
{
    App.game.solution = [];
    App.game.guess = [];
    App.game.round = 0;
}
function BuildBoard()
{
    var i = 0;
    SetMinimumWidth();
    for (i = 0; i < App.settings.guesses; i++) {
        $('#game_board').append('<div class="row"></div>');
    }
    for (i = 0; i < App.settings.holes; i++) {
        $('#game_board .row').append('<div class="holder"></div>');
    }
    $('#game_board .row').append('<div class="display_correct contains' + App.settings.holes + '"></div>');
    for (i = 0; i < App.settings.holes; i++) {
        $('.display_correct').append('<div class="correct_marker"></div>');
    }
    if (App.settings.holes === 5) {
        $('.display_correct div:nth-child(3)').addClass('center_marker');
    }
    
    $('#game_board').on('click', '.active .holder', function () {
        $('#game_board .selected').removeClass('selected');
        $(this).addClass('selected');
    });
}
function SetMinimumWidth()
{
    var minimumWidth = Math.max((App.settings.colors + 1) * 48, (App.settings.holes + 1) * 52, 350),
        dialogMinimumWidth = Math.max(App.settings.holes * 50, 268);
    if (App.settings.holes === 6) {
        minimumWidth += 4;
    }
    $('h1').css('minWidth', minimumWidth + 'px');
    $('#codebreaker_game').css('minWidth', minimumWidth + 'px');
    $('.dialog').css('minWidth', dialogMinimumWidth + 'px');
}
function BuildColorPicker()
{
    var i = 0,
        selectedIndex,
        clicksSinceAddingColor = 0,
        dragDistance = 0;
    for (i = 0; i < App.settings.colors; i++) {
        $('#color_chooser').append('<div class="holder"><div class="marble ' + App.settings.allColors[i] + '"></div></div>');
        $('#color_chooser .holder').each(function() {
            var n = $(this).index(),
                left = (48 * n) + 16;
            $(this).css('left', left + "px");
        });
        $('#color_chooser .marble').draggable({
            helper: 'clone',
            drag: function() {
                dragDistance++;
            },
            stop: function() {
                if (dragDistance < 5) {
                    $(this).click();
                }
                dragDistance = 0;
            }
        });
    }
    $('#color_chooser .marble').click(function() {
        console.log("You clicked on a color.");
        selectedIndex = $('#game_board .selected').index();
        clicksSinceAddingColor++;
        if (selectedIndex !== -1) {
            HandleChooseColor(selectedIndex, App.settings.allColors[$(this).parent('.holder').index()]);
            clicksSinceAddingColor = 0;
        }
    }).dblclick(function() {
        console.log("You double-clicked on a color.");
        if (clicksSinceAddingColor > 1) {
            HandleChooseColor(GetFirstEmptySlot(), App.settings.allColors[$(this).parent('.holder').index()]);
        }
    });
}
function BuildPreferences()
{   
    $('#opt_colors li:contains(' + App.settings.colors + ')').addClass('current');
    $('#opt_length li:contains(' + App.settings.holes + ')').addClass('current');
    $('#opt_guesses li:contains(' + App.settings.guesses + ')').addClass('current');
    if (!App.settings.duplicates) {
        $('#preferences #checkmark').hide();
    }
}

/***** Game Start Helpers *****/
function ChooseNewPattern(game)
{
    var i, rand, tempColors, tempHolder;
    
    if (game != null) {
        console.log(game);
        App.game.solution = game;
    }
    else if (App.settings.duplicates) {
        for (i = 0; i < App.settings.holes; i++) {
            rand = Math.floor(Math.random() * App.settings.colors);
            App.game.solution[i] = App.settings.allColors[rand];
        }
    }
    else {
        // select only the colors we need
        tempColors = App.settings.allColors.slice(0, App.settings.colors)

        // shuffle array by stepping through each item and swapping it with a random position
        for (i = 0; i < tempColors.length; i++) {
            rand = Math.floor(Math.random() * App.settings.colors);
            tempHolder = tempColors[i];
            tempColors[i] = tempColors[rand];
            tempColors[rand] = tempHolder;
        }

        // Set the game solution to the shuffled array
        App.game.solution = tempColors.slice(0, App.settings.holes);
    }
}
function StartNewRound()
{
    var i = 0,
        row;
    App.game.round++;
    for (i = 0; i < App.settings.holes; i++) {
        App.game.guess[i] = null;
    }
    row = App.settings.guesses - (App.game.round - 1);
    $('#game_board .row:nth-child(' + row + ')').addClass('active');
    
    $('.active .holder').droppable({
        disabled: false,
        hoverClass: 'drop_hover',
        drop: function(event, ui) {
            HandleChooseColor ($(this).index(), GetDroppedColor());
        }
    });
}
/***** Gameplay Helpers *****/
function GetFirstEmptySlot()
{
    var i;
    for (i = 0; i < App.settings.holes; i++)
    {
        if (App.game.guess[i] == null) {
            return i;
        }
    }
    return -1;
}
function GetDroppedColor()
{
    var i = 0,
        selectedColor = $('.ui-draggable-dragging').attr('class');
    selectedColor = selectedColor.replace("marble", "");
    selectedColor = selectedColor.replace("ui-draggable", "");
    selectedColor = selectedColor.replace("ui-draggable-dragging", "");
    for (i = 0; i < App.settings.colors; i++) {
        if (selectedColor.search(App.settings.allColors[i]) != -1) {
            selectedColor = App.settings.allColors[i];
            break;
        }
    }
    return selectedColor;
}
function HandleChooseColor(selectedSlot, selectedColor)
{
    if (selectedSlot !== -1) {
        var currentHolder = $('#game_board .active .holder').eq(selectedSlot);
        $('#game_board .selected').removeClass('selected');
        currentHolder.children('.marble').remove();
        currentHolder.append('<div class="marble"></div>');
        currentHolder.children('.marble').addClass(selectedColor);
        currentHolder.children('.marble').draggable({
            // cloned so it can be dragged outside of the game board
            helper: 'clone',
            start: function(event, ui) {
                // hide the original marble while moving
                $(this).hide();
                App.game.guess[selectedSlot] = null;
            },
            stop: function(event, ui) {
                $(this).remove();
            }
        });
        App.game.guess[selectedSlot] = selectedColor;
        CheckForCompleteGuess();
    }
}
function CheckForCompleteGuess()
{
    var allColorsChosen = true,
        i = 0;
    for (i = 0; i < App.settings.holes; i++) {
        if (App.game.guess[i] == null) {
            allColorsChosen = false;
            break;
        }
    }
    if (allColorsChosen) {
        EvaluateGuess();
    }
}
function EvaluateGuess()
{
    var correctPieces = 0,
        correctColors = 0,
        solutionCopy = App.game.solution.slice(0),
        guessPatternCopy = App.game.guess.slice(0),
        i = 0,
        j = 0;
    // First, look only for exact matches
    for (i = 0; i < App.settings.holes; i++) {
        if (guessPatternCopy[i] == solutionCopy[i]) {
            solutionCopy[i] = null;
            guessPatternCopy[i] = null;
            correctPieces++;
        }
    }
    // Then, look for remaining colors that are correct
    // TODO: Use filter() here to clear out the null values
    for (i = 0; i < App.settings.holes; i++) {
        if (guessPatternCopy[i] != null) {
            for (j = 0; j < App.settings.holes; j++) {
                if (guessPatternCopy[i] == solutionCopy[j]) {
                    correctColors++;
                    solutionCopy[j] = null;
                    break;
                }
            }
        }
    }
    for (i = 0; i < correctPieces; i++) {
        j = i + 1;
        $('.active .display_correct div:nth-child(' + j + ')').addClass('black');
    }
    for (i = 0; i < correctColors; i++) {
        $('.active .display_correct div:nth-child(' + (correctPieces + i + 1) + ')').addClass('white');
    }
    EndRound();
    if (correctPieces == App.settings.holes) {
        HandleWinGame();
    }
    else {
        if (App.game.round < App.settings.guesses) {
            StartNewRound();
        }
        else {
            HandleLoseGame();
        }
    }
}
function EndRound()
{
    $('#game_board .ui-draggable').draggable('option', 'disabled', true);
    $('.holder.ui-droppable').droppable('option', 'disabled', true);
    $('.active').removeClass('active');
    $('#game_board .ui-draggable').removeClass('ui-draggable');
    $('.ui-droppable').removeClass('ui-droppable');
}
function HandleWinGame()
{
    var d = new Date(),
        cookieSuffix = String(App.settings.colors) + '_' + String(App.settings.holes) + '_' + 
            String(App.settings.guesses) + '_' + String(Number(App.settings.duplicates)),
        wins = parseInt(GetCookie('wins' + cookieSuffix), 10) || 0,
        losses = parseInt(GetCookie('losses' + cookieSuffix), 10) || 0,
        gamesPlayed,
        gameTime,
        totalTime = parseInt(GetCookie('totalTime' + cookieSuffix), 10) || 0,
        avgRounds = parseFloat(GetCookie('avgRounds' + cookieSuffix)) || 0;

    wins++;
    gamesPlayed = wins + losses;
    gameTime = App.timer.getElapsedTime();
    totalTime += gameTime;
    avgRounds = (avgRounds * (gamesPlayed - 1) + App.game.round) / wins;
    console.log("avgRounds: " + avgRounds);
    SetCookie('wins' + cookieSuffix, String(wins), 90);
    SetCookie('totalTime' + cookieSuffix, String(totalTime), 90);
    SetCookie('avgRounds' + cookieSuffix, String(avgRounds), 90);
    $('#rounds_to_win').html('<span class="fancy">' + App.game.round + '</span> guess' + (App.game.round === 1 ? "" : "es"));
    $('#time_to_win').html(FormatTimeToWin(gameTime));
    $('#show_more_stats').text('See More Statistics and Averages');
    $('#more_stats').hide();
    $('#statsSetup').html(App.settings.colors + ' colors, ' + App.settings.holes + ' holes, ' + (App.settings.duplicates ? 'and ' : '') + App.settings.guesses + ' guesses' + (App.settings.duplicates ? '' : ', and no duplicates'));
    $('#statsRecord').html(
        'Your averages after ' + wins + ' win' + (wins === 1 ? '' : 's') +
        (losses === 0 ? '<br />(and no losses)' :
        ',<br />' + losses + ' loss' + (losses === 1 ? '' : 'es')));
    $('#avg_rounds_to_win').html('<span class="fancy">' + Math.round(avgRounds * 100) / 100 + '</span> guess' + (avgRounds === 1 ? "" : "es"));
    $('#avg_time_to_win').html(FormatTimeToWin(totalTime / wins));
    ShowDialog($('.dialog#win_message'));
}
function HandleLoseGame()
{
    var cookieSuffix = String(App.settings.colors) + '_' + String(App.settings.holes) + '_' + 
            String(App.settings.guesses) + '_' + String(Number(App.settings.duplicates)),
        losses = parseInt(GetCookie('losses' + cookieSuffix), 10) || 0;
    losses++;
    SetCookie('losses' + cookieSuffix, String(losses), 90);
    $('#solution').empty();
    for (i = 0; i < App.settings.holes; i++) {
        $('#solution').append('<div class="holder"><div class="marble ' + App.game.solution[i] + '"></div></div>');
    }
    ShowDialog($('.dialog#lose_message'));
}
/***** Overlay Helpers *****/
function ShowDialog(dialog, callback)
{
    $('#game_board').fadeTo(250, .4);
    $('#color_chooser').fadeTo(250, .4);
    $('#overlay').fadeIn(250, function() {
        dialog.fadeIn(250);
        if (typeof callback == "function") {
            console.log("Trying to call callback.");
            callback();
        }
    });
}
function HideDialog(callback)
{
    $('.dialog:visible').fadeOut(250, function() {
        $('#overlay').fadeOut(250);
        $('#color_chooser').fadeTo(250, 1);
        $('#game_board').fadeTo(250, 1, function() {
            if (typeof callback == "function") {
                console.log("Trying to call callback.");
                callback();
            }
        });
    });
}
function FormatTimeToWin(time)
{
    var secondsToWin = Math.round(time / 1000),
        minutesToWin = 0,
        hoursToWin = 0,
        output = "";
    if (secondsToWin >= 60) {
        minutesToWin = Math.floor(secondsToWin / 60);
        secondsToWin -= minutesToWin * 60;
        
        if (minutesToWin >= 60) {
            hoursToWin = Math.floor(minutesToWin / 60);
            minutesToWin -= hoursToWin * 60;
        }
    }
    if (hoursToWin > 0) {
        output += "<span class=\"fancy\">" + hoursToWin + "</span> hour" + (hoursToWin === 1 ? "" : "s");
        if (minutesToWin > 0 || secondsToWin > 0) {
            output += ", ";
        }
    }
    if (minutesToWin > 0) {
        output += "<span class=\"fancy\">" + minutesToWin + "</span> minute" + (minutesToWin === 1 ? "" : "s");
        if (secondsToWin > 0) {
            output += ", ";
        }
    }
    if (secondsToWin > 0) {
        output += "<span class=\"fancy\">" + secondsToWin + "</span> second" + (secondsToWin === 1 ? "" : "s");
    }
    return output;
}
/***** Ajax-based Helpers *****/
function RetrievePattern(urlHash)
{
    // Try to find the game in the database
    $.post('./scripts/retrievePattern.php', {url: urlHash}, function(data) {
        var pattern;
        // If the script has any problems, show the error and wait for user action
        if (data.error != null) {
            $('#errorMessage').html(data.error);
            $('.dialog#error .button').show();
            $('.dialog#error .button:contains("Okay")').hide();
            ShowDialog($('.dialog#error'));
        }
        else {
            pattern = data.pattern.split('.');
            App.settings.colors = parseInt(data.colors);
            App.settings.holes = pattern.length;
            App.settings.guesses = parseInt(data.guesses);
            App.settings.duplicates = parseInt(data.duplicates) === 1;
            BuildGame();
            StartGame(pattern);
            console.log('A specific game was requested: ' + pattern);
        }
    }, 'json')
    // Handle any connection errors
    .error(function() {
        $('#errorMessage').html('A problem was encountered while trying to load the game you requested.');
        $('.dialog#error .button').show();
        $('.dialog#error .button:contains("Okay")').hide();
        ShowDialog($('.dialog#error'));
    });
}
function StorePattern()
{
    $.post('./scripts/storePattern.php', {'colors[]': App.game.solution, numberOfColors: App.settings.colors, numberOfGuesses: App.settings.guesses, repeat: App.settings.duplicates}, function(data) {
        if (data.error != null) {
            $('#errorMessage').html('Something went wrong while getting an id for this game: ' + data.error);
            $('#startNewGame').hide();
            $('.dialog#error .button').show();
            $('.dialog#error .button:contains("No Thanks"), .dialog#error .button:contains("Sure")').hide();
            ShowDialog($('.dialog#error'), App.timer.pause);
        }
        else {
            self.document.location.hash = '#' + data.url;
            $('#gameUrl').val(self.document.location);
            ShowDialog($('.dialog#shareGame'), App.timer.pause);
        }
    }, 'json')
    
    // Handle any connection errors
    .error(function() {
        $('#errorMessage').html('A problem was encountered while connecting to the server to store your current game.');
        $('#startNewGame').hide();
        $('.dialog#error .button').show();
            $('.dialog#error .button:contains("No Thanks"), .dialog#error .button:contains("Sure")').hide();
        ShowDialog($('.dialog#error'), App.timer.pause);
    });
}
/***** Event Handlers *****/

$('#show_more_stats').on('click', function () {
    if ($('#more_stats').is(':visible')) {
        $('#more_stats').slideUp(300);
        $(this).text('See More Statistics and Averages');
    }
    else {
        $('#more_stats').slideDown(300);
        $(this).text('Hide Statistics and Averages');
    }
});

$('.dialog .button:contains("I\'m Done")').on('click', function () {
    console.log("I\'m Done was clicked.");
    HideDialog();
});
$('.dialog .button:contains("Play Again")').on('click', function () {
    console.log("Play Again was clicked.");
    HideDialog();
    ResetGame();
    StartGame();
});
$('#preferences .button:contains("Cancel")').on('click', function () {
    console.log("Cancel was clicked.");
    App.timer.resume();
    HideDialog();
});
$('#preferences  .button:contains("Save")').on('click', function () {
    console.log("Save was clicked.");
    App.settings.colors = tempNumberOfColors;
    App.settings.holes = tempNumberOfHoles;
    App.settings.guesses = tempNumberOfGuesses;
    App.settings.duplicates = $('#preferences #checkmark').is(':visible');
    SetCookie('settings', [App.settings.colors, App.settings.holes, App.settings.guesses, App.settings.duplicates].join(), 90);
    HideDialog();
    ResetBoard();
    StartGame();
});
$('.dialog .button:contains("Resume"), .dialog .button:contains("Continue")').on('click', function () {
    App.timer.resume();
    HideDialog();
});
$('.dialog .button:contains("Okay")').on('click', function () {
    App.timer.resume();
    HideDialog();
});
$('.dialog .button:contains("No Thanks")').on('click', function () {
    HideDialog();
});
$('.dialog .button:contains("Sure")').on('click', function() {
    HideDialog();
    ResetBoard();
    StartGame();
});

$('#preferences li').on('click', function () {
    var category;
    $(this).closest('ul').children('.current').removeClass('current');
    $(this).addClass('current');
    
    category = $(this).closest('ul').attr('id');

    if (category.indexOf('colors') !== -1) {
        tempNumberOfColors = parseInt($(this).text(), 10);
    }
    else if (category.indexOf('length') !== -1) {
        tempNumberOfHoles = parseInt($(this).text(), 10);
    }
    else if (category.indexOf('guesses') !== -1) {
        tempNumberOfGuesses = parseInt($(this).text(), 10);
    }
});
$('#preferences .checkbox').on('click', function () {
    $(this).find('#checkmark').toggle();
});

$('#pref-button').on('click', function () {
    console.log("The preferences button was clicked.");
    tempNumberOfColors = App.settings.colors;
    tempNumberOfHoles = App.settings.holes;
    tempNumberOfGuesses = App.settings.guesses;
    ShowDialog($('.dialog#preferences'), App.timer.pause);
});
$('#pause-button').on('click', function () {
    ShowDialog($('.dialog#paused'), App.timer.pause);
});
$('#share-button').on('click', function () {
    StorePattern();
});

/***** Cookie Helpers *****/
function SetCookie(key,value,days)
{
    var date,
        expires;
    if (days) {
        date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    else {
        expires = "";
    }
    document.cookie = key + "=" + value + expires + "; path=/";
}
function GetCookie(key)
{
    var nameEQ = key + "=",
        ca = document.cookie.split(';'),
        i,
        c;
    for (i = 0; i < ca.length; i++) {
        c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
