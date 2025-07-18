// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class FeesClaimed extends ethereum.Event {
  get params(): FeesClaimed__Params {
    return new FeesClaimed__Params(this);
  }
}

export class FeesClaimed__Params {
  _event: FeesClaimed;

  constructor(event: FeesClaimed) {
    this._event = event;
  }

  get bot(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get feeToken(): Address {
    return this._event.parameters[1].value.toAddress();
  }

  get amount(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }
}

export class OwnershipTransferred extends ethereum.Event {
  get params(): OwnershipTransferred__Params {
    return new OwnershipTransferred__Params(this);
  }
}

export class OwnershipTransferred__Params {
  _event: OwnershipTransferred;

  constructor(event: OwnershipTransferred) {
    this._event = event;
  }

  get previousOwner(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get newOwner(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class Fees extends ethereum.SmartContract {
  static bind(address: Address): Fees {
    return new Fees("Fees", address);
  }

  BOT_FEE(): BigInt {
    let result = super.call("BOT_FEE", "BOT_FEE():(uint256)", []);

    return result[0].toBigInt();
  }

  try_BOT_FEE(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("BOT_FEE", "BOT_FEE():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  PROTOCOL_FEE(): BigInt {
    let result = super.call("PROTOCOL_FEE", "PROTOCOL_FEE():(uint256)", []);

    return result[0].toBigInt();
  }

  try_PROTOCOL_FEE(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("PROTOCOL_FEE", "PROTOCOL_FEE():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  botTokenBalance(param0: Address, param1: Address): BigInt {
    let result = super.call(
      "botTokenBalance",
      "botTokenBalance(address,address):(uint256)",
      [ethereum.Value.fromAddress(param0), ethereum.Value.fromAddress(param1)]
    );

    return result[0].toBigInt();
  }

  try_botTokenBalance(
    param0: Address,
    param1: Address
  ): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "botTokenBalance",
      "botTokenBalance(address,address):(uint256)",
      [ethereum.Value.fromAddress(param0), ethereum.Value.fromAddress(param1)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getBotFeeQuote(amountIn: BigInt): BigInt {
    let result = super.call(
      "getBotFeeQuote",
      "getBotFeeQuote(uint256):(uint256)",
      [ethereum.Value.fromUnsignedBigInt(amountIn)]
    );

    return result[0].toBigInt();
  }

  try_getBotFeeQuote(amountIn: BigInt): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getBotFeeQuote",
      "getBotFeeQuote(uint256):(uint256)",
      [ethereum.Value.fromUnsignedBigInt(amountIn)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getProtocolFeeQuote(amountIn: BigInt): BigInt {
    let result = super.call(
      "getProtocolFeeQuote",
      "getProtocolFeeQuote(uint256):(uint256)",
      [ethereum.Value.fromUnsignedBigInt(amountIn)]
    );

    return result[0].toBigInt();
  }

  try_getProtocolFeeQuote(amountIn: BigInt): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getProtocolFeeQuote",
      "getProtocolFeeQuote(uint256):(uint256)",
      [ethereum.Value.fromUnsignedBigInt(amountIn)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  owner(): Address {
    let result = super.call("owner", "owner():(address)", []);

    return result[0].toAddress();
  }

  try_owner(): ethereum.CallResult<Address> {
    let result = super.tryCall("owner", "owner():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class RenounceOwnershipCall extends ethereum.Call {
  get inputs(): RenounceOwnershipCall__Inputs {
    return new RenounceOwnershipCall__Inputs(this);
  }

  get outputs(): RenounceOwnershipCall__Outputs {
    return new RenounceOwnershipCall__Outputs(this);
  }
}

export class RenounceOwnershipCall__Inputs {
  _call: RenounceOwnershipCall;

  constructor(call: RenounceOwnershipCall) {
    this._call = call;
  }
}

export class RenounceOwnershipCall__Outputs {
  _call: RenounceOwnershipCall;

  constructor(call: RenounceOwnershipCall) {
    this._call = call;
  }
}

export class TakeFeesCall extends ethereum.Call {
  get inputs(): TakeFeesCall__Inputs {
    return new TakeFeesCall__Inputs(this);
  }

  get outputs(): TakeFeesCall__Outputs {
    return new TakeFeesCall__Outputs(this);
  }
}

export class TakeFeesCall__Inputs {
  _call: TakeFeesCall;

  constructor(call: TakeFeesCall) {
    this._call = call;
  }

  get bot(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get feeToken(): Address {
    return this._call.inputValues[1].value.toAddress();
  }
}

export class TakeFeesCall__Outputs {
  _call: TakeFeesCall;

  constructor(call: TakeFeesCall) {
    this._call = call;
  }
}

export class TransferOwnershipCall extends ethereum.Call {
  get inputs(): TransferOwnershipCall__Inputs {
    return new TransferOwnershipCall__Inputs(this);
  }

  get outputs(): TransferOwnershipCall__Outputs {
    return new TransferOwnershipCall__Outputs(this);
  }
}

export class TransferOwnershipCall__Inputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }

  get newOwner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class TransferOwnershipCall__Outputs {
  _call: TransferOwnershipCall;

  constructor(call: TransferOwnershipCall) {
    this._call = call;
  }
}

export class WithdrawFeesCall extends ethereum.Call {
  get inputs(): WithdrawFeesCall__Inputs {
    return new WithdrawFeesCall__Inputs(this);
  }

  get outputs(): WithdrawFeesCall__Outputs {
    return new WithdrawFeesCall__Outputs(this);
  }
}

export class WithdrawFeesCall__Inputs {
  _call: WithdrawFeesCall;

  constructor(call: WithdrawFeesCall) {
    this._call = call;
  }

  get bot(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get feeToken(): Address {
    return this._call.inputValues[1].value.toAddress();
  }
}

export class WithdrawFeesCall__Outputs {
  _call: WithdrawFeesCall;

  constructor(call: WithdrawFeesCall) {
    this._call = call;
  }
}
