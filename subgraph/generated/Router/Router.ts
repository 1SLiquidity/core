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

export class InstaSettleConfigured extends ethereum.Event {
  get params(): InstaSettleConfigured__Params {
    return new InstaSettleConfigured__Params(this);
  }
}

export class InstaSettleConfigured__Params {
  _event: InstaSettleConfigured;

  constructor(event: InstaSettleConfigured) {
    this._event = event;
  }

  get tradeId(): BigInt {
    return this._event.parameters[0].value.toBigInt();
  }

  get enabled(): boolean {
    return this._event.parameters[1].value.toBoolean();
  }

  get instasettleBps(): BigInt {
    return this._event.parameters[2].value.toBigInt();
  }
}

export class Router extends ethereum.SmartContract {
  static bind(address: Address): Router {
    return new Router("Router", address);
  }

  core(): Address {
    let result = super.call("core", "core():(address)", []);

    return result[0].toAddress();
  }

  try_core(): ethereum.CallResult<Address> {
    let result = super.tryCall("core", "core():(address)", []);
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

  get _core(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class ConfigureInstaSettleCall extends ethereum.Call {
  get inputs(): ConfigureInstaSettleCall__Inputs {
    return new ConfigureInstaSettleCall__Inputs(this);
  }

  get outputs(): ConfigureInstaSettleCall__Outputs {
    return new ConfigureInstaSettleCall__Outputs(this);
  }
}

export class ConfigureInstaSettleCall__Inputs {
  _call: ConfigureInstaSettleCall;

  constructor(call: ConfigureInstaSettleCall) {
    this._call = call;
  }

  get tradeId(): BigInt {
    return this._call.inputValues[0].value.toBigInt();
  }

  get enabled(): boolean {
    return this._call.inputValues[1].value.toBoolean();
  }

  get instasettleBps(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }
}

export class ConfigureInstaSettleCall__Outputs {
  _call: ConfigureInstaSettleCall;

  constructor(call: ConfigureInstaSettleCall) {
    this._call = call;
  }
}
