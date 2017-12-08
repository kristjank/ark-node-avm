'use strict';

var constants = require('../helpers/constants.js');

// Private fields
var self, modules, library;

// Constructor
function Contract () {
	self = this;
}


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
	return constants.fees.publishContract;
};

//
//__API__ `verify`

//
Contract.prototype.verify = function (trs, sender, cb) {

	// var isAddress = /^[1-9A-Za-z]{1,35}$/g;
	// if (!trs.recipientId || !isAddress.test(trs.recipientId)) {
	// 	return cb('Invalid recipient');
	// }

	// if(trs.recipientId != this.generateAddress(trs))
	// {
	// 	return cb('Invalid contract address');
	// }

	return cb(null, trs);
};

//
//__API__ `process`

//
Contract.prototype.process = function (trs, sender, cb) {

	// trs.recipientId = self.generateAddress(trs)

	return cb(null, trs);
};

//
//__API__ `getBytes`

//
Contract.prototype.getBytes = function (trs) {
	var buf;

	try {
		buf = trs.asset.code ? new Buffer(trs.asset.code, 'utf8') : null;
	} catch (e) {
		throw e;
	}

	return buf;
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

	var contractId = self.generateAddress(trs);

	// add to code to contract account here
	modules.accounts.getAccount({
		u_username: contractId
	}, function (err, account) {
		if (err) {
			return cb(err);
		}

		if (account) {
			return cb('Username already exists');
		}

		// do stuff
	});
};

//
//__API__ `undoUnconfirmed`

//
Contract.prototype.undoUnconfirmed = function (trs, sender, cb) {
	if (trs.asset.votes === null) { return cb(); }

	var votesInvert = Diff.reverse(trs.asset.votes);
	this.scope.account.merge(sender.address, {u_delegates: votesInvert}, cb);
};

// asset schema
Contract.prototype.schema = {
	id: 'contract',
	type: 'object',
	properties: {
		code: {
			type: 'string',
			format: 'hex'
		}
	},
	required: ['code']
};

//
//__API__ `objectNormalize`

//
Contract.prototype.objectNormalize = function (trs) {
	var report = library.schema.validate(trs.asset, Contract.prototype.schema);

	if (!report) {
		throw 'Failed to validate vote schema: ' + this.scope.schema.getLastErrors().map(function (err) {
			return err.message;
		}).join(', ');
	}

	return trs;
};

Contract.prototype.generateAddress = function(trs)
{
	return library.crypto.getContractAddress(trs.asset.code);
}

//
//__API__ `dbRead`

//
Contract.prototype.dbRead = function (raw) {

	if (!raw.vote) {
		return null;
	} else {
		var code = raw.code;

		return {code: code};
	}
};

Contract.prototype.dbTable = 'code';

Contract.prototype.dbFields = [
	'code'
];

//
//__API__ `dbSave`

//
Contract.prototype.dbSave = function (trs) {
	return {
		table: this.dbTable,
		fields: this.dbFields,
		values: {
			code: code,
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


