Meteor.methods({
  add_game: function (name) {
    var href = name.toLowerCase().replace(/\W+/g, '');
    if (href.length > 0 && !Games.findOne({href: href})) {
      Games.insert({name: name, href: href});
      return href;
    }
    if (href.length == 0) {
      throw new Meteor.Error(400, 'Enter a game name');
    } else {
      throw new Meteor.Error(400, 'Game "' + name + '" already exists');
    }
  },

  add_player: function (name, game) {
    var g = Games.findOne({href: game});
    var p = Players.findOne({name: name, game: game});
    if (g && !p) {
      Players.insert({
        name: name,
        game: game,
        rating: 1000,
        wins: 0,
        losses: 0,
        last_game: 0
      });
      return;
    }
    throw new Meteor.Error(400, 'Player "' + name + '" already exists');
  },

  add_result: function(winner, loser, game) {
    var w = Players.findOne({name: winner, game: game});
    var l = Players.findOne({name: loser, game: game});
    if (w && l) {
      var diffs = calculateEloDiffs(w.rating, l.rating);
      var winnerDiff = diffs[0];
      var loserDiff = diffs[1];
      var timestamp = new Date().getTime();
      Players.update(w._id,
                     {$set: {
                        rating: w.rating + winnerDiff,
                        wins: w.wins + 1,
                        last_game: timestamp}});
      Players.update(l._id,
                     {$set: {
                        rating: l.rating + loserDiff,
                        losses: l.losses + 1,
                        last_game: timestamp}});
      var resultId = Results.insert({
        winner: winner,
        loser: loser,
        game: game,
        winner_change: winnerDiff,
        loser_change: loserDiff,
        timestamp: timestamp
      });
      return resultId;
    }
  },

  undo_result: function(resultId) {
    var r = Results.findOne(resultId);
    if (r) {
      var w = Players.findOne({name: r.winner, game: r.game});
      var l = Players.findOne({name: r.loser, game: r.game});
      if (w && l) {
        Players.update(w._id,
                       {$set: {
                          rating: w.rating - r.winner_change,
                          wins: w.wins - 1}});
        Players.update(l._id,
                       {$set: {
                          rating: l.rating - r.loser_change,
                          losses: l.losses - 1}});
        Results.remove(r._id);
      }
    }
  }
});