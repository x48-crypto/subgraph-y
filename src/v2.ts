import { BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  V2Contract,
  Transfer as TransferEvent,
} from "../generated/yearn TrueUSD v2/V2Contract";

import { erc20Contract } from "../generated/yearn TrueUSD v2/erc20Contract";

import { Address } from "@graphprotocol/graph-ts";

import { Vault, Deposit, Account, Withdraw, Transfer } from "../generated/schema";

function getVault(vaultAddress: Address): Vault {
  let vault = new Vault(vaultAddress.toHexString());
  let vaultContract = V2Contract.bind(vaultAddress);
  let getPricePerFullShare = vaultContract.try_pricePerShare();
  if (!getPricePerFullShare.reverted) {
    vault.getPricePerFullShare = getPricePerFullShare.value
  } else {
    vault.getPricePerFullShare = new BigInt(0)
  }
  vault.totalSupply = vaultContract.totalAssets();
  vault.balance = vaultContract.totalSupply();
  vault.token = vaultContract.token();
  vault.symbol = vaultContract.symbol();
  vault.name = vaultContract.name();
  return vault;
}

export function handleTransferV2(event: TransferEvent): void {
  let emptyAddress = "0x0000000000000000000000000000000000000000";
  let transactionId = event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString();
  let transactionHash = event.transaction.hash;
  let vaultAddress = event.address;
  let timestamp = event.block.timestamp;
  let blockNumber = event.block.number;
  let to = event.params.receiver;
  let from = event.params.receiver;
  let value = event.params.value;
  let vaultContract = V2Contract.bind(vaultAddress);
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
    if (totalSupply.toString() != "0") {
      deposit.amount = (balance * value) / totalSupply;
    } else {
      deposit.amount = new BigInt(0);
    }
    deposit.vaultAddress = vaultAddress;
    deposit.account = to;
    deposit.shares = value;
    deposit.timestamp = timestamp;
    deposit.blockNumber = blockNumber;
    deposit.getPricePerFullShare = vault.getPricePerFullShare;
    deposit.save();
  }

  // Vault withdrawal
  if (vaultWithdrawal) {
    let withdraw = new Withdraw(transactionId);
    withdraw.vaultAddress = vaultAddress;
    withdraw.account = from;
    if (totalSupply.toString() != "0") {
      withdraw.amount = (balance * value) / totalSupply;
    } else {
      withdraw.amount = new BigInt(0);
    }

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
