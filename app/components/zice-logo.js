// @flow
import React from 'react';
import styled, { withTheme } from 'styled-components';

import ziceLogo from '../assets/images/logo.png';

const ZiCEImg = styled.img`
  height: 100%;
  width: 100%;
`;

export const ZiCELogo = () => (
  <ZiCEImg src={ziceLogo} />
);
