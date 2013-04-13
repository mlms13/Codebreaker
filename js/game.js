var numberOfColors = 6,
    numberOfHoles = 4,
    numberOfGuesses = 10,
    allowDuplicateColors = true,
    potentialColors = ["red", "orange", "yellow", "green", "blue", "purple", "pink", "brown"], // All possible colors
    colors, // Allowable colors, taken from potentialColors and based on numberOfColors
    solution, // The sequence that the user is trying to guess
    guessPattern, // A pattern containing the user's guess
    currentRound,
    startTime,
    endTime,
    isPaused,
    pauseStart,
    pauseLength,
    tempNumberOfColors,
    tempNumberOfHoles,
    tempNumberOfGuesses;

$(document).ready(function() {
    var urlHash = self.document.location.hash.substring(1);
    MakeButtonsClickable();
    InitializeSettings();
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
function MakeButtonsClickable()
{
    BuildWinDialog();
    BuildDialogButtons();
    BuildPreferencesButtons();
    BuildMenuButtons();
}
function InitializeSettings()
{
    var settings = GetCookie('settings') || '6,4,10,true'; // retrieve settings from a cookie, or use defaults
    console.log('settings set to: ' + settings);
    settings = settings.split(',');
    numberOfColors = parseInt(settings[0]);
    numberOfHoles = parseInt(settings[1]);
    numberOfGuesses = parseInt(settings[2]);
    allowDuplicateColors = settings[3] === 'true';
}
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
    startTime = d.getTime();
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
    console.log("InitializeVariables was called.");
    colors = potentialColors.slice(0, numberOfColors);
    solution = [];
    guessPattern = [];
    currentRound = 0;
    startTime = 0;
    endTime = 0;
    isPaused = false;
    pauseStart = 0;
    pauseLength = 0;
}
function BuildBoard()
{
    var i = 0;
    SetMinimumWidth();
    for (i = 0; i < numberOfGuesses; i++) {
        $('#game_board').append('<div class="row"></div>');
    }
    for (i = 0; i < numberOfHoles; i++) {
        $('#game_board .row').append('<div class="holder"></div>');
    }
    $('#game_board .row').append('<div class="display_correct contains' + numberOfHoles + '"></div>');
    for (i = 0; i < numberOfHoles; i++) {
        $('.display_correct').append('<div class="correct_marker"></div>');
    }
    if (numberOfHoles === 5) {
        $('.display_correct div:nth-child(3)').addClass('center_marker');
    }
    
    $('#game_board').delegate('.active .holder', 'click', function() {
        $('#game_board .selected').removeClass('selected');
        $(this).addClass('selected');
    });
}
function SetMinimumWidth()
{
    var minimumWidth = Math.max((numberOfColors + 1) * 48, (numberOfHoles + 1) * 52, 350),
        dialogMinimumWidth = Math.max(numberOfHoles * 50, 268);
    if (numberOfHoles === 6) {
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
    for (i = 0; i < numberOfColors; i++) {
        $('#color_chooser').append('<div class="holder"><div class="marble ' + colors[i] + '"></div></div>');
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
            HandleChooseColor(selectedIndex, colors[$(this).parent('.holder').index()]);
            clicksSinceAddingColor = 0;
        }
    }).dblclick(function() {
        console.log("You double-clicked on a color.");
        if (clicksSinceAddingColor > 1) {
            HandleChooseColor(GetFirstEmptySlot(), colors[$(this).parent('.holder').index()]);
        }
    });
}
function BuildPreferences()
{   
    $('#opt_colors li:contains(' + numberOfColors + ')').addClass('current');
    $('#opt_length li:contains(' + numberOfHoles + ')').addClass('current');
    $('#opt_guesses li:contains(' + numberOfGuesses + ')').addClass('current');
    if (!allowDuplicateColors) {
        $('#preferences #checkmark').hide();
    }
}
function BuildPreferencesButtons()
{
    $('#preferences li').click(function() {
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
    $('#preferences .checkbox').click(function() {
        $(this).find('#checkmark').toggle();
    });
}
function BuildWinDialog()
{
    $('#show_more_stats').click(function() {
        if ($('#more_stats').is(':visible')) {
            $('#more_stats').slideUp(300);
            $(this).text('See More Statistics and Averages');
        }
        else {
            $('#more_stats').slideDown(300);
            $(this).text('Hide Statistics and Averages');
        }
    });
}
function BuildDialogButtons()
{
    $('.dialog .button:contains("I\'m Done")').click(function() {
        console.log("I\'m Done was clicked.");
        HideDialog();
    });
    $('.dialog .button:contains("Play Again")').click(function() {
        console.log("Play Again was clicked.");
        HideDialog();
        ResetGame();
        StartGame();
    });
    $('#preferences .button:contains("Cancel")').click(function() {
        console.log("Cancel was clicked.");
        Resume();
        HideDialog();
    });
    $('#preferences  .button:contains("Save")').click(function() {
        console.log("Save was clicked.");
        numberOfColors = tempNumberOfColors;
        numberOfHoles = tempNumberOfHoles;
        numberOfGuesses = tempNumberOfGuesses;
        allowDuplicateColors = $('#preferences #checkmark').is(':visible');
        SetCookie('settings', [numberOfColors, numberOfHoles, numberOfGuesses, allowDuplicateColors].join(), 90);
        HideDialog();
        ResetBoard();
        StartGame();
    });
    $('.dialog .button:contains("Resume"), .dialog .button:contains("Continue")').click(function() {
        Resume();
        HideDialog();
    });
    $('.dialog .button:contains("Okay")').click(function() {
        Resume();
        HideDialog();
    });
    $('.dialog .button:contains("No Thanks")').click(function() {
        HideDialog();
    });
    $('.dialog .button:contains("Sure")').click(function() {
        HideDialog();
        ResetBoard();
        StartGame();
    });
}
function BuildMenuButtons()
{
    $('#preferences_button').click(function() {
        console.log("The preferences button was clicked.");
        tempNumberOfColors = numberOfColors;
        tempNumberOfHoles = numberOfHoles;
        tempNumberOfGuesses = numberOfGuesses;
        ShowDialog($('.dialog#preferences'), Pause);
    });
    $('#pauseButton').click(function() {
        ShowDialog($('.dialog#paused'), Pause);
    });
    $('#shareButton').click(function() {
        StorePattern();
    });
}
/***** Game Start Helpers *****/
function ChooseNewPattern(game)
{
    var i = 0,
        rand = 0,
        tempColors = colors.slice(0),
        tempHolder;
    
    if (game != null) {
        console.log(game);
        solution = game;
    }
    else if (allowDuplicateColors) {
        for (i = 0; i < numberOfHoles; i++) {
            rand = Math.floor(Math.random() * numberOfColors);
            solution[i] = colors[rand];
        }
    }
    else {
        for (i = 0; i < tempColors.length; i++) {
            rand = Math.floor(Math.random() * numberOfColors);
            tempHolder = tempColors[i];
            tempColors[i] = tempColors[rand];
            tempColors[rand] = tempHolder;
        }
        for (i = 0; i < numberOfHoles; i++) {
            solution[i] = tempColors[i];
        }
    }
}
function StartNewRound()
{
    var i = 0,
        row;
    currentRound++;
    for (i = 0; i < numberOfHoles; i++) {
        guessPattern[i] = null;
    }
    row = numberOfGuesses - (currentRound - 1);
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
    for (i = 0; i < numberOfHoles; i++)
    {
        if (guessPattern[i] == null) {
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
    for (i = 0; i < numberOfColors; i++) {
        if (selectedColor.search(colors[i]) != -1) {
            selectedColor = colors[i];
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
                guessPattern[selectedSlot] = null;
            },
            stop: function(event, ui) {
                $(this).remove();
            }
        });
        guessPattern[selectedSlot] = selectedColor;
        CheckForCompleteGuess();
    }
}
function CheckForCompleteGuess()
{
    var allColorsChosen = true,
        i = 0;
    for (i = 0; i < numberOfHoles; i++) {
        if (guessPattern[i] == null) {
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
        solutionCopy = solution.slice(0),
        guessPatternCopy = guessPattern.slice(0),
        i = 0,
        j = 0;
    // First, look only for exact matches
    for (i = 0; i < numberOfHoles; i++) {
        if (guessPatternCopy[i] == solutionCopy[i]) {
            solutionCopy[i] = null;
            guessPatternCopy[i] = null;
            correctPieces++;
        }
    }
    // Then, look for remaining colors that are correct
    // TODO: Use filter() here to clear out the null values
    for (i = 0; i < numberOfHoles; i++) {
        if (guessPatternCopy[i] != null) {
            for (j = 0; j < numberOfHoles; j++) {
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
    if (correctPieces == numberOfHoles) {
        HandleWinGame();
    }
    else {
        if (currentRound < numberOfGuesses) {
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
    $('.holder').droppable('option', 'disabled', true);
    $('.active').removeClass('active');
    $('#game_board .ui-draggable').removeClass('ui-draggable');
    $('.ui-droppable').removeClass('ui-droppable');
}
function HandleWinGame()
{
    var d = new Date(),
        cookieSuffix = String(numberOfColors) + '_' + String(numberOfHoles) + '_' + 
            String(numberOfGuesses) + '_' + String(Number(allowDuplicateColors)),
        wins = parseInt(GetCookie('wins' + cookieSuffix), 10) || 0,
        losses = parseInt(GetCookie('losses' + cookieSuffix), 10) || 0,
        gamesPlayed,
        gameTime,
        totalTime = parseInt(GetCookie('totalTime' + cookieSuffix), 10) || 0,
        avgRounds = parseFloat(GetCookie('avgRounds' + cookieSuffix)) || 0;
    endTime = d.getTime();
    wins++;
    gamesPlayed = wins + losses;
    gameTime = (endTime - startTime) - pauseLength;
    totalTime += gameTime;
    avgRounds = (avgRounds * (gamesPlayed - 1) + currentRound) / wins;
    console.log("avgRounds: " + avgRounds);
    SetCookie('wins' + cookieSuffix, String(wins), 90);
    SetCookie('totalTime' + cookieSuffix, String(totalTime), 90);
    SetCookie('avgRounds' + cookieSuffix, String(avgRounds), 90);
    $('#rounds_to_win').html('<span class="fancy">' + currentRound + '</span> guess' + (currentRound === 1 ? "" : "es"));
    $('#time_to_win').html(FormatTimeToWin(gameTime));
    $('#show_more_stats').text('See More Statistics and Averages');
    $('#more_stats').hide();
    $('#statsSetup').html(numberOfColors + ' colors, ' + numberOfHoles + ' holes, ' + (allowDuplicateColors ? 'and ' : '') + numberOfGuesses + ' guesses' + (allowDuplicateColors ? '' : ', and no duplicates'));
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
    var cookieSuffix = String(numberOfColors) + '_' + String(numberOfHoles) + '_' + 
            String(numberOfGuesses) + '_' + String(Number(allowDuplicateColors)),
        losses = parseInt(GetCookie('losses' + cookieSuffix), 10) || 0;
    losses++;
    SetCookie('losses' + cookieSuffix, String(losses), 90);
    $('#solution').empty();
    for (i = 0; i < numberOfHoles; i++) {
        $('#solution').append('<div class="holder"><div class="marble ' + solution[i] + '"></div></div>');
    }
    ShowDialog($('.dialog#lose_message'));
}
function Pause()
{
    var d = new Date();
    if (startTime != 0 && endTime == 0) {
        pauseStart = d.getTime();
        $('#game_board').addClass('paused');
        isPaused = true;
        console.log("Pausing.");
    }
    else {
        console.log("The clock isn't running.");
    }
}
function Resume()
{
    var d = new Date();
    if (isPaused) {
        pauseLength += d.getTime() - pauseStart;
        $('#game_board').removeClass('paused');
        isPaused = false;
        console.log("Resuming. Paused for " + pauseLength + "ms.");   
    }
    else {
        console.log("Not resuming because the game was't paused.");
    }
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
            numberOfColors = parseInt(data.colors);
            numberOfHoles = pattern.length;
            numberOfGuesses = parseInt(data.guesses);
            allowDuplicateColors = parseInt(data.duplicates) === 1;
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
    $.post('./scripts/storePattern.php', {'colors[]': solution, numberOfColors: numberOfColors, numberOfGuesses: numberOfGuesses, repeat: allowDuplicateColors}, function(data) {
        if (data.error != null) {
            $('#errorMessage').html('Something went wrong while getting an id for this game: ' + data.error);
            $('#startNewGame').hide();
            $('.dialog#error .button').show();
            $('.dialog#error .button:contains("No Thanks"), .dialog#error .button:contains("Sure")').hide();
            ShowDialog($('.dialog#error'), Pause);
        }
        else {
            self.document.location.hash = '#' + data.url;
            $('#gameUrl').val(self.document.location);
            ShowDialog($('.dialog#shareGame'), Pause);
        }
    }, 'json')
    
    // Handle any connection errors
    .error(function() {
        $('#errorMessage').html('A problem was encountered while connecting to the server to store your current game.');
        $('#startNewGame').hide();
        $('.dialog#error .button').show();
            $('.dialog#error .button:contains("No Thanks"), .dialog#error .button:contains("Sure")').hide();
        ShowDialog($('.dialog#error'), Pause);
    });
}
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
