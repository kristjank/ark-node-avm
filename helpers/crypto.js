// import { Buffer } from 'buffer';

'use strict';

var arkjs = require('arkjs');
var bs58check = require('bs58check')


function Crypto(scope){
	this.scope = scope;
	this.network = scope.config.network;
}

Crypto.prototype.makeKeypair = function (seed) {
	return arkjs.crypto.getKeys(seed, this.network);
};

Crypto.prototype.sign = function (hash, keypair) {
	return keypair.sign(hash).toDER().toString("hex");
};

Crypto.prototype.verify = function (hash, signatureBuffer, publicKeyBuffer) {
	try {
		var ecsignature = arkjs.ECSignature.fromDER(signatureBuffer);
		var ecpair = arkjs.ECPair.fromPublicKeyBuffer(publicKeyBuffer, this.network);
		return ecpair.verify(hash, ecsignature);
	} catch (error){
		return false;
	}
};

// this prolly should go into arkjs, no time now..
Crypto.prototype.getContractAddress = function(bytes) {
	
	var version = 28; // C
	
	var ctAddress = arkjs.crypto.sha256(new Buffer(bytes, 'hex'));
	ctAddress = arkjs.crypto.ripemd160(ctAddress);

	var payload = new Buffer(21);
	payload.writeUInt8(version, 0);
	ctAddress.copy(payload, 1);

	ctAddress =  bs58check.encode(payload);

	return ctAddress;
}

module.exports = Crypto;
