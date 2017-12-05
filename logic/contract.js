'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var modules, library;

// Constructor
function Contract () {}


// Public methods
//
//__API__ `bind`

//
Contract.prototype.bind = function (scope) {
	modules = scope.modules;
	library = scope.library;
};

//
//__API__ `create`

//
Contract.prototype.create = function (data, trs) {
	trs.recipientId = data.sender.address;
	trs.asset.votes = data.votes;

	return trs;
};

//
//__API__ `calculateFee`

//
Contract.prototype.calculateFee = function (trs) {
	return constants.fees.vote;
};

//
//__API__ `verify`

//
Contract.prototype.verify = function (trs, sender, cb) {
	if (trs.recipientId !== trs.senderId) {
		return cb('Invalid recipient');
	}

	if (!trs.asset || !trs.asset.votes) {
		return cb('Invalid transaction asset');
	}

	if (!Array.isArray(trs.asset.votes)) {
		return cb('Invalid votes. Must be an array');
	}

	if (!trs.asset.votes.length) {
		return cb('Invalid votes. Must not be empty');
	}

	if (trs.asset.votes && trs.asset.votes.length > constants.maximumVotes) {
		return cb('Voting limit exceeded. Maximum is '+constants.maximumVotes+' vote per transaction');
	}

	modules.delegates.checkConfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}
		return cb(err, trs);
	});
};

//
//__API__ `process`

//
Contract.prototype.process = function (trs, sender, cb) {
	return cb(null, trs);
};

//
//__API__ `getBytes`

//
Contract.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = trs.asset.votes ? new Buffer(trs.asset.votes.join(''), 'utf8') : null;
	} catch (e) {
		throw e;
	}

	return buf;
};


//
//__API__ `checkConfirmedDelegates`

//
Contract.prototype.checkConfirmedDelegates = function (trs, cb) {
	modules.delegates.checkConfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}

		return cb(err);
	});
};


//
//__API__ `checkUnconfirmedDelegates`

//
Contract.prototype.checkUnconfirmedDelegates = function (trs, cb) {
	modules.delegates.checkUnconfirmedDelegates(trs.senderPublicKey, trs.asset.votes, function (err) {
		if (err && exceptions.votes.indexOf(trs.id) > -1) {
			library.logger.debug(err);
			library.logger.debug(JSON.stringify(trs));
			err = null;
		}

		return cb(err);
	});
};

//
//__API__ `apply`

//
Contract.prototype.apply = function (trs, block, sender, cb) {
	var parent = this;

	async.series([
		function (seriesCb) {
			self.checkConfirmedDelegates(trs, seriesCb);
		},
		function (seriesCb) {
			parent.scope.account.merge(sender.address, {
				delegates: trs.asset.votes,
				blockId: block.id,
				round: modules.rounds.getRoundFromHeight(block.height)
			}, seriesCb);
		}
	], cb);
};


//
//__API__ `undo`

//
Contract.prototype.undo = function (trs, block, sender, cb) {
	if (trs.asset.votes === null) { return cb(); }

	var votesInvert = Diff.reverse(trs.asset.votes);

	this.scope.account.merge(sender.address, {
		delegates: votesInvert,
		blockId: block.id,
		round: modules.rounds.getRoundFromHeight(block.height)
	}, cb);
};

//
//__API__ `applyUnconfirmed`

//
Contract.prototype.applyUnconfirmed = function (trs, sender, cb) {
	var parent = this;

	async.series([
		function (seriesCb) {
			self.checkUnconfirmedDelegates(trs, seriesCb);
		},
		function (seriesCb) {
			parent.scope.account.merge(sender.address, {
				u_delegates: trs.asset.votes
			}, seriesCb);
		}
	], cb);
};

//
//__API__ `undoUnconfirmed`

//
Contract.prototype.undoUnconfirmed = function (trs, sender, cb) {
	if (trs.asset.votes === null) { return cb(); }

	var votesInvert = Diff.reverse(trs.asset.votes);
	this.scope.account.merge(sender.address, {u_delegates: votesInvert}, cb);
};

Contract.prototype.schema = {
	id: 'Vote',
	type: 'object',
	properties: {
		votes: {
			type: 'array',
			minLength: 1,
			maxLength: constants.maximumVotes,
			uniqueItems: true
		}
	},
	required: ['votes']
};

//
//__API__ `objectNormalize`

//
Contract.prototype.objectNormalize = function (trs) {
	// var report = library.schema.validate(trs.asset, Contract.prototype.schema);

	if (!report) {
		throw 'Failed to validate vote schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

//
//__API__ `dbRead`

//
Contract.prototype.dbRead = function (raw) {
	// console.log(raw.v_votes);

	if (!raw.v_votes) {
		return null;
	} else {
		var votes = raw.v_votes.split(',');

		return {votes: votes};
	}
};

Contract.prototype.dbTable = 'votes';

Contract.prototype.dbFields = [
	'votes',
	'transactionId'
];

//
//__API__ `dbSave`

//
Contract.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			votes: Array.isArray(trs.asset.votes) ? trs.asset.votes.join(',') : null,
			transactionId: trs.id
		}
	};
};

//
//__API__ `ready`

//
Contract.prototype.ready = function (trs, sender) {
	if (Array.isArray(sender.multisignatures) && sender.multisignatures.length) {
		if (!Array.isArray(trs.signatures)) {
			return false;
		}
		return trs.signatures.length >= sender.multimin;
	} else {
		return true;
	}
};


// Export
module.exports = Contract;


