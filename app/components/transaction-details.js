// @flow

import React from 'react';
import styled, { withTheme } from 'styled-components';
import dateFns from 'date-fns';
import { BigNumber } from 'bignumber.js';

import { ZICE_EXPLORER_BASE_URL } from '../constants/explorer';
import { DARK } from '../constants/themes';

import SentIconDark from '../assets/images/transaction_sent_icon_dark.svg';
import PendingIconDark from '../assets/images/transaction_pending_icon_dark.svg';
import ReceivedIconDark from '../assets/images/transaction_received_icon_dark.svg';
import SentIconLight from '../assets/images/transaction_sent_icon_light.svg';
import ReceivedIconLight from '../assets/images/transaction_received_icon_light.svg';
import CloseIcon from '../assets/images/close_icon.svg';

import { TextComponent } from './text';
import { RowComponent } from './row';
import { ColumnComponent } from './column';

import { formatNumber } from '../utils/format-number';
import { openExternal } from '../utils/open-external';
import { getCoinName } from '../utils/get-coin-name';

import { MAINNET, TESTNET } from '../../app/constants/zice-network';
import { isTestnet } from '../../config/is-testnet';
import * as Sql from '../../app/utils/sqlite'

const Wrapper = styled.div`
  width: 100%;
  max-width: 700px;
  background-color: ${props => props.theme.colors.transactionDetailsBg};
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: ${props => props.theme.boxBorderRadius};
  box-shadow: ${props => props.theme.colors.transactionDetailsShadow};
  position: relative;
`;

const TitleWrapper = styled.div`
  margin-top: 20px;
  margin-bottom: 30px;
`;

const Icon = styled.img`
  width: 40px;
  height: 40px;
  margin: 20px 0;
`;

const CloseIconWrapper = styled.div`
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: flex-end;
  position: absolute;
`;

const CloseIconImg = styled.img`
  width: 16px;
  height: 16px;
  margin-top: 12px;
  margin-right: 12px;
  cursor: pointer;
  &:hover {
    filter: brightness(150%);
  }
`;

const InfoRow = styled(RowComponent)`
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 80px;
  padding: 0 30px;
  &first-child {
    margin-top: 30px;
  }
  &:hover {
    background: ${props => props.theme.colors.transactionDetailsRowHover};
  }
`;

const DetailsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
`;

const Divider = styled.div`
  width: 100%;
  background-color: ${props => props.theme.colors.transactionDetailsDivider};
  height: 1px;
  opacity: 0.5;
`;

const Label = styled(TextComponent)`
  font-weight: ${props => String(props.theme.fontWeight.bold)};
  color: ${props => props.theme.colors.transactionDetailsLabel};
  margin-bottom: 5px;
  letter-spacing: 0.25px;
`;

const Ellipsis = styled(TextComponent)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;

const TransactionDetailsAddress = styled(TextComponent)`
  user-select: text;
  -ms-word-break: break-all;
  word-break: break-all;
  word-break: break-word;
`;

const TransactionDetailsMemo = styled(TextComponent)`
  -ms-word-break: break-all;
  word-break: break-all;
  word-break: break-word;
  width: 100%;
  user-select: text;
`;

const TransactionId = styled.button`
  width: 100%;
  color: ${props => props.theme.colors.text};
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  outline: none;
  &:hover {
    text-decoration: underline;
  }
`;

type Props = {
  amount: number,
  type: 'send' | 'receive',
  zicePrice: number,
  date: string,
  transactionId: string,
  fromaddress: string,
  toaddress: string,
  handleClose: () => void,
  theme: AppTheme,
  confirmed: boolean,
  confirmations: number,
  memo: String,
};

const Component = ({
  amount,
  type,
  zicePrice,
  date,
  transactionId,
  fromaddress,
  toaddress,
  handleClose,
  theme,
  confirmed,
  confirmations,
  memo,
}: Props) => {
  const isReceived = type === 'receive';
  const isImmature = type === 'immature';
  const isGenerate = type === 'generate';
  const isSent = type === 'sent';
  const isIncoming = isReceived || isImmature || isGenerate;

  const receivedIcon = theme.mode === DARK ? ReceivedIconDark : ReceivedIconLight;
  const sentIcon = theme.mode === DARK ? SentIconDark : SentIconLight;
  const coinName = getCoinName();


  let confirmationValue = 'Unconfirmed';
  if (confirmations >= 3) confirmationValue = confirmations;
  if (confirmed) confirmationValue = confirmations;

  const getIconSrc = (state) => {
    return (
      {
        receive:  receivedIcon,
        generate: ReceivedIconDark,
        send:     sentIcon,
        immature: PendingIconDark
      }[state]
    );
  }

  const saveClose = async () => {

    const txStore = await Sql.sqlCommand('SELECT * FROM opid')

    txStore.map(async obj => {
      if (obj.txid === transactionId &&
          obj.category === type &&
          obj.amount === amount) {
        obj.isRead = true;
        await Sql.sqlCommand('UPDATE opid SET isread = 1 WHERE txid = "' + transactionId + '" AND category = "' + type + '" AND amount = "' + amount + '"')
      }
    })
    handleClose()
  }

  const getTextColor = (state) => {
    return (
      {
        receive:  theme.colors.transactionReceived,
        generate: theme.colors.transactionReceived,
        send:     theme.colors.transactionSent,
        immature: theme.colors.transactionPending
      }[state]
    );
  }

  return (
    <Wrapper>
      <CloseIconWrapper>
        <CloseIconImg src={CloseIcon} onClick={saveClose} />
      </CloseIconWrapper>
      <TitleWrapper>
        <TextComponent value='Transaction Details' align='center' />
      </TitleWrapper>
      <DetailsWrapper>
        <Icon src={getIconSrc(type)} alt='Transaction Type Icon' />
        <TextComponent
          isBold
          size={2.625}
          value={formatNumber({
            append: `${isIncoming ? '+' : '-'}${coinName} `,
            value: amount,
          })}
          color={getTextColor(type)}
        />
        <TextComponent
          value={formatNumber({
            append: `${isIncoming ? '+' : '-'}USD `,
            value: new BigNumber(amount).times(zicePrice).toNumber(),
          })}
          size={1.5}
          color={theme.colors.transactionDetailsLabel({ theme })}
        />
      </DetailsWrapper>
      <InfoRow>
        <ColumnComponent>
          <Label value='DATE' />
          <TextComponent value={dateFns.format(new Date(date), 'MMMM D, YYYY HH:MMA')} />
        </ColumnComponent>
        {confirmations > 0 && (
          <ColumnComponent>
            <TextComponent
              value='Confirmations'
              isBold
              color={theme.colors.transactionDetailsLabel({ theme })}
            />
            <TextComponent value={String(confirmationValue)} />
          </ColumnComponent>
        )}
      </InfoRow>
      <Divider />
      <InfoRow>
        <ColumnComponent width='100%'>
          <Label value='TRANSACTION ID' />
          <TransactionId onClick={() => openExternal(ZICE_EXPLORER_BASE_URL + transactionId)}>
            <Ellipsis value={transactionId} />
          </TransactionId>
        </ColumnComponent>
      </InfoRow>
      <Divider />
      <InfoRow>
        <ColumnComponent width='100%'>
          <Label value='ADDRESS' />
          <TransactionDetailsAddress value={toaddress} />
        </ColumnComponent>
      </InfoRow>
      <Divider />
      {memo.length > 0 && (
        <InfoRow>
          <ColumnComponent width='100%'>
            <Label value='MEMO' />
            <TransactionDetailsMemo value={memo} />
          </ColumnComponent>
        </InfoRow>
      )}
    </Wrapper>
  );
};

export const TransactionDetailsComponent = withTheme(Component);