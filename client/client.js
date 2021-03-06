var CUR_DATE;
var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var resultsDeps = new Deps.Dependency();

var room = function() {
  var pathSplit = window.location.pathname.split('/');
  if (pathSplit.length >= 2 && pathSplit[1] != '') {
    return decodeURI(pathSplit[1]);
  }
  return '';
};

var game = function() {
  return Games.findOne({href: room()});
};

Template.index.rendered = function() {
  FastClick.attach(document.body);
};

Template.index.show = function() {
  return room() == '';
};

Template.index.games = function () {
  return Games.find({});
};

Template.index.events({
  'click .game-link': function() {
    window.location.href = $(event.target).parents('a').attr('href');
    return false;
  },

  'click #add-link': function () {
    $('#game-list-container').slideUp();
    $('#add-game').slideDown(function() {
      $('#name-input').focus();
    });
    return false;
  },

  'click .back-link': function () {
    $('.error').hide();
    $('#add-game').slideUp();
    $('#game-list-container').slideDown();
    return false;
  },

  'click #add-game-submit': function() {
    var name = $('#name-input').val();
    var $error = $('.error');
    if (name.trim().length == 0) {
      $error.text('Enter a game name').show();
      return;
    }
    $error.hide();
    Meteor.call('add_game', name, function(error, result) {
      if (error) {
        $error.text(error.reason).show();
      } else {
        window.location.href = '/' + result;
      }
    });
  }
});

Template.game.show = function() {
  return room() != '';
};

Template.game.title = function() {
  var g = game();
  return g && g.name;
};

Template.game.players = function() {
  var players = Players.find({}, {sort: {rating: -1, name: 1}}).fetch();
  var monthAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  var result = [];
  var old = [];
  for (var ii = 0, len = players.length; ii < len; ii++) {
    var player = players[ii];
    if (monthAgo > player.last_game) {
      player.inactive = true;
      old.push(player);
    } else {
      result.push(player);
    }
  }
  return result.concat(old);
}

Template.game.alphaPlayers = function() {
  return Players.find({}, {sort: {name: 1}});
}

Template.game.events({
  'click #home-link': function() {
    window.location.href = '/';
  },

  'click #results-tab': function() {
    $('.active').removeClass('active');
    $('#results-tab').addClass('active');
    $('#rankings').slideUp();
    $('#results').slideDown();
    return false;
  },

  'click #rankings-tab': function() {
    $('.active').removeClass('active');
    $('#rankings-tab').addClass('active');
    $('#results').slideUp();
    $('#rankings').slideDown();
    return false;
  },

  'click #add-link': function() {
    $('#player-list').slideUp();
    $('#add-player').slideDown(function() {
      $('#name-input').focus();
    });
  },

  'click #record-link': function() {
    $('#player-list').slideUp();
    $('#add-result').slideDown();
  },

  'click .back-link': function () {
    $('.error').hide();
    $('#add-player, #add-result').slideUp();
    $('#player-list').slideDown();
    return false;
  },

  'click #add-player-submit': function() {
    var name = $('#name-input').val();
    var $error = $('#add-player .error');
    if (!name) {
      $error.text('Please enter a player name').show();
    }
    $error.hide();
    Meteor.call('add_player', name, room(), function(error, result) {
      if (error) {
        $error.text(error.reason).show();
      } else {
        $error.hide();
        $('#add-player').slideUp();
        $('#player-list').slideDown();
        $('#name-input').val('');
      }
    });
  },

  'click #add-result-submit': function() {
    var winner = $('#winner').val();
    var loser = $('#loser').val();
    var $error = $('#add-result .error');
    if (winner == '' || loser == '') {
      $error.text('Please enter a winner and a loser').show();
    } else if (winner == loser) {
      $error.text('Winner and loser can\'t be the same').show();
    } else {
      Meteor.call('add_result', winner, loser, room(), function(error, result) {
        if (result) {
          $('#undo-record-link').attr('result-id', result).show();
          setTimeout(function() {
            $('#undo-record-link').removeAttr('result-id').slideUp();
          }, 20 * 1000);
        }
        $error.hide();
        $('#add-result').slideUp();
        $('#player-list').slideDown();
        $('#winner, #loser').val('');
      });
    }
  },

  'click #undo-record-link': function(event) {
    var $button = $(event.target);
    var resultId = $button.attr('result-id');
    if (resultId) {
      Meteor.call('undo_result', resultId, function(error, result) {
        $button.slideUp();
      });
    }
  }
});

Template.results.rendered = function() {
  CUR_DATE = null;
}

Template.results.results = function() {
  resultsDeps.depend();
  return Results.find({}, {sort: {timestamp: -1}, limit: 10});
}

Template.results.maybeSimpleDate = function() {
  var date = new Date(this.timestamp);
  var dateString = MONTH_NAMES[date.getMonth()] + ' ' + date.getDate();
  if (CUR_DATE == null || CUR_DATE != dateString) {
    CUR_DATE = dateString
    var $separator = $('<li/>')
      .text(dateString)
      .addClass('date-separator');
    return $separator[0].outerHTML;
  }
}

Meteor.startup(function() {
  Deps.autorun(function() {
    if (room() != '') {
      Meteor.subscribe('players', room());
      Meteor.subscribe('results', room());
    }
    Meteor.subscribe('games', room());
    Results.find({}).observe({
      added: function() {
        resultsDeps.changed();
      },
      removed: function() {
        resultsDeps.changed();
      }
    });
  });
});
