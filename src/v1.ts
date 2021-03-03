import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  V1Contract,
  Transfer as TransferEvent,
} from "../generated/yearn TrueUSD/V1Contract";

import { erc20Contract } from "../generated/yearn TrueUSD/erc20Contract";

import { Address } from "@graphprotocol/graph-ts";

import { Vault, Account, Deposit, Withdraw, Transfer } from "../generated/schema";

function getVault(vaultAddress: Address): Vault {
  let vault = new Vault(vaultAddress.toHexString());
  let vaultContract = V1Contract.bind(vaultAddress);
  let getPricePerFullShare = vaultContract.try_getPricePerFullShare();
  if (!getPricePerFullShare.reverted) {
    vault.getPricePerFullShare = getPricePerFullShare.value
  } else {
    vault.getPricePerFullShare = new BigInt(0)
  }
  vault.totalSupply = vaultContract.totalSupply();
  vault.balance = vaultContract.balance();
  vault.token = vaultContract.token();
  vault.symbol = vaultContract.symbol();
  vault.name = vaultContract.name();
  return vault;
}

export function handleTransferV1(event: TransferEvent): void {
  let emptyAddress = "0x0000000000000000000000000000000000000000";
  let transactionId = event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString();
  let transactionHash = event.transaction.hash;
  let vaultAddress = event.address;
  let timestamp = event.block.timestamp;
  let blockNumber = event.block.number;
  let to = event.params.to;
  let from = event.params.from;
  let value = event.params.value;
  let vaultContract = V1Contract.bind(vaultAddress);
  let transfer = new Transfer(transactionId);
  let vault = getVault(vaultAddress);
  let vaultDeposit = from.toHexString() == emptyAddress;
  let vaultWithdrawal = to.toHexString() == emptyAddress;
  let totalSupply = vault.totalSupply;
  let balance = vault.balance;

  vault.timestamp = timestamp;
  vault.blockNumber = blockNumber;
  vault.save();

  // Vault deposit
  if (vaultDeposit) {
    let deposit = new Deposit(transactionId);
    let amount = (balance * value) / totalSupply;
    deposit.vaultAddress = vaultAddress;
    deposit.account = to;
    deposit.amount = amount;
    deposit.shares = value;
    deposit.timestamp = timestamp;
    deposit.blockNumber = blockNumber;
    deposit.getPricePerFullShare = vault.getPricePerFullShare;
    deposit.save();
  }

  // Vault withdrawal
  if (vaultWithdrawal) {
    let withdraw = new Withdraw(transactionId);
    let amount = (balance * value) / totalSupply;
    withdraw.vaultAddress = vaultAddress;
    withdraw.account = from;
    withdraw.amount = amount;
    withdraw.shares = value;
    withdraw.timestamp = timestamp;
    withdraw.blockNumber = blockNumber;
    withdraw.getPricePerFullShare = vault.getPricePerFullShare;
    withdraw.save();
  }

  transfer.from = from;
  transfer.to = to;
  transfer.value = value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.vaultAddress = vaultAddress;
  transfer.getPricePerFullShare = vault.getPricePerFullShare;
  transfer.balance = balance;
  transfer.totalSupply = totalSupply;
  transfer.transactionHash = transactionHash;
  transfer.save();
  
  // Save account
  let accountAddress = vaultDeposit ? to : from;
  let account = new Account(accountAddress.toHexString());
  account.amount = vaultContract.balanceOf(to)
  account.timestamp = timestamp;
  account.blockNumber = blockNumber;
  account.save()
}
