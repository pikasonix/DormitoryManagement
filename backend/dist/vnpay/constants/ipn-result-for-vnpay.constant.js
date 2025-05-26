"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpnUnknownError = exports.IpnFailChecksum = exports.IpnInvalidAmount = exports.IpnIpProhibited = exports.InpOrderAlreadyConfirmed = exports.IpnOrderNotFound = exports.IpnSuccess = void 0;
exports.IpnSuccess = {
    RspCode: '00',
    Message: 'Confirm Success',
};
exports.IpnOrderNotFound = {
    RspCode: '01',
    Message: 'Order not found',
};
exports.InpOrderAlreadyConfirmed = {
    RspCode: '02',
    Message: 'Order already confirmed',
};
exports.IpnIpProhibited = {
    RspCode: '03',
    Message: 'IP prohibited',
};
exports.IpnInvalidAmount = {
    RspCode: '04',
    Message: 'Invalid amount',
};
exports.IpnFailChecksum = {
    RspCode: '97',
    Message: 'Fail checksum',
};
exports.IpnUnknownError = {
    RspCode: '99',
    Message: 'Unknown error',
};
