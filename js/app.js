// API endpoints for operations
const API_URL = 'http://localhost:3000';
const REGISTER_URL = API_URL + '/account/register';
const LOGIN_URL = API_URL + '/account/login';
const TOKEN_VALIDITY_URL = API_URL + '/account/me';
const CHARACTER_URL = API_URL + '/character';

// HTML elements used in the application
var $sidePanelBody = $('#side-panel-body');
var $sidePanelTitle = $('#side-panel-title');
var $mainPanelBody = $('#main-panel-body');
var $mainPanelTitle = $('#main-panel-title');
var $body = $('body');
var postRouteFunction = {
  'content/characters.html': 'LoadCharacters'
};

$(function() {
  // Stop running the application if local storage isn't available
  if (!window.localStorage) {
    bootbox.alert('There is no local storage support for this browser and hence this app won\'t work!');
    $mainPanelBody.text('There is no local storage support for this browser and hence this app won\'t work!');
    $sidePanelBody.text('-');
    return;
  }
  // Initialize important variables
  var token = localStorage.getItem('token');
  var currentUser = localStorage.getItem('user');
  var isLoggedIn = token !== null ? true : false;
  var currentRoute = localStorage.getItem('route') !== null ? localStorage.getItem('route') : 'content/home.html';
  var currentTitle = localStorage.getItem('title') !== null ? localStorage.getItem('title') : 'Home';

  // Load the current route. Required to load the same page on refresh
  LoadMainPanel(currentRoute, currentTitle);

  // Confirm token status by fetching data from server
  if (isLoggedIn) {
    DoJsonGetRequest(TOKEN_VALIDITY_URL, function(data) {
      if (data.user) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(data.user));
        LoadSidePanel('content/info.html', 'Account Info', function() {
          PopulateSidePanelInfo(currentUser);
        });
      }
    }, function(xhr) {
      isLoggedIn = false;
      LoadSidePanel('content/login.html', 'Login');
    });
  } else {
    LoadSidePanel('content/login.html', 'Login');
  }

  // Navigation handler
  $body.on('click', '.navigate', function(e) {
    e.preventDefault();
    currentRoute = $(this).attr('href');
    currentTitle = $(this).data('title');
    LoadMainPanel(currentRoute, currentTitle);
  });

  // Login handler
  $body.on('submit', '#login-form', function(e) {
    e.preventDefault();
    DoJsonPostRequest(LOGIN_URL, function(data) {
      if (data.user) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        LoadSidePanel('content/info.html', 'Account Info', function() {
          PopulateSidePanelInfo(currentUser);
        });
      } else {
        bootbox.alert('Login was successful but user data was not received!');
        LoadSidePanel('content/info.html', 'Account Info');
      }
      if (data.token) {
        isLoggedIn = true;
        token = data.token;
        localStorage.setItem('token', token);
      } else {
        isLoggedIn = false;
        bootbox.alert('Login failed as token was not received from server!');
      }
    }, function (xhr) {
      isLoggedIn = false;
      var decodedData = JSON.parse(xhr.responseText);
      if (decodedData.errors && decodedData.errors.length != 0 && decodedData.errors[0].msg) {
        bootbox.alert(decodedData.errors[0].msg);
      } else {
        bootbox.alert('Login failed!');
      }
    }, { username: $('#loginform-username').val(), password: $('#loginform-password').val()});
  });

  // Registration handler
  $body.on('submit', '#register-form', function(e) {
    e.preventDefault();
    DoJsonPostRequest(REGISTER_URL, function(data) {
      if (data.msg) {
        bootbox.alert(data.msg);
      } else {
        bootbox.alert('Account was registered successfully');
      }
      $('#register-form').trigger('reset');
    }, function (xhr) {
      isLoggedIn = false;
      var decodedData = JSON.parse(xhr.responseText);
      if (decodedData.errors && decodedData.errors.length != 0 && decodedData.errors[0].msg) {
        bootbox.alert(decodedData.errors[0].msg);
      } else {
        bootbox.alert('Registration failed!');
      }
    }, { username: $('#registerform-username').val(), password: $('#registerform-password').val(), email: $('#registerform-email').val()});
  });

  // Log out handler
  $body.on('click', '#side-panel-logout', function(e) {
    e.preventDefault();
    isLoggedIn = false;
    currentUser = null;
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    LoadSidePanel('content/login.html', 'Login');
  });

  // Character select handler
  $body.on('click', '.character-select', function(e) {
    e.preventDefault();
    $('.character-select').removeClass('active');
    $(this).addClass('active');
    var CharacterIdx = $(this).data('id');
    DoRequest('content/character.html', 'get', function(html) {
      $('#character-info').html(html);
      DoJsonGetRequest(CHARACTER_URL + '/' + CharacterIdx, function(data) {
        for (var key in data) {
          if (key == 'CharacterIdx') {
            continue;
          }
          $('<tr/>', {
            html: '<td>' + key + '</td><th>' + data[key] + '</th>'
          }).appendTo('#character-info-table');
        }
      }, function(xhr) {
        var decodedData = JSON.parse(xhr.responseText);
        if (decodedData.errors && decodedData.errors.length != 0 && decodedData.errors[0].msg) {
          $('#character-info-container').html(decodedData.errors[0].msg);
        } else {
          $('#character-info-container').text('Failed to fetch character data');
        }
      });
    });
  });
});

function PopulateSidePanelInfo(user) {
  $('#side-panel-username').text(user.ID);
  $('#side-panel-email').text(user.Email);
}

function UpdateNavActive(route) {
  $('.navigate').each(function () {
    $(this).parent().removeClass('active');
    if ($(this).attr('href') == route) {
      $(this).parent().addClass('active');
    }
  });
}

function LoadSidePanel(url, title, onAfterLoad = null) {
  $sidePanelTitle.text(title);
  $sidePanelBody.text('Loading...');
  DoRequest(url, 'get', function(data) {
    $sidePanelBody.html(data);
    if (typeof onAfterLoad === 'function') {
      onAfterLoad();
    }
  }, function(xhr) {
    $sidePanelBody.html(xhr.responseText);
  });
}

function LoadMainPanel(url, title, onAfterLoad = null) {
  $mainPanelTitle.text(title);
  $mainPanelBody.text('Loading...');
  UpdateNavActive(url);
  localStorage.setItem('route', url);
  localStorage.setItem('title', title);
  DoRequest(url, 'get', function(data) {
    $mainPanelBody.html(data);
    if (typeof onAfterLoad === 'function') {
      onAfterLoad();
    }
    if (postRouteFunction[url]) {
      window[postRouteFunction[url]]();
    }
  }, function(xhr) {
    $mainPanelBody.html(xhr.responseText);
  });
}

function LoadCharacters() {
  DoJsonGetRequest(CHARACTER_URL, function(data) {
    if (data.characters && data.characters.length !== 0) {
      for (let i = 0; i < data.characters.length; i++) {
        $('<div/>', {
          class: 'panel character-select',
          'data-id': data.characters[i].CharacterIdx,
          html: '<img src="img/' + data.characters[i].Class + '.png">&nbsp;' + data.characters[i].Name
        }).appendTo('#character-list');
      }
    } else {
      $('#character-info').text('You do no have any characters');
    }
  }, function() {
    $('#character-info').text('You do no have any characters');
  });
}

function DoJsonGetRequest(url, onSuccess, onError) {
  DoJsonRequest(url, 'get', onSuccess, onError);
}

function DoJsonPostRequest(url, onSuccess, onError, data) {
  DoJsonRequest(url, 'post', onSuccess, onError, data);
}

function DoJsonPutRequest(url, onSuccess, onError, data) {
  DoJsonRequest(url, 'put', onSuccess, onError, data);
}

function DoJsonRequest(url, type, onSuccess, onError, data = null) {
  var options = {
    url: url,
    type: type,
    success: onSuccess,
    error: onError,
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    beforeSend: function(xhr) {
      if (localStorage.getItem('token') != null) {
        xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem('token'));
      }
    }
  };
  if (data != null) {
    options['data'] = JSON.stringify(data);
  }
  $.ajax(options);
}

function DoRequest(url, type, onSuccess, onError, data = null) {
  var options = {
    url: url,
    type: type,
    success: onSuccess,
    error: onError
  };
  if (data != null) {
    options['data'] = JSON.stringify(data);
  }
  $.ajax(options);
}
