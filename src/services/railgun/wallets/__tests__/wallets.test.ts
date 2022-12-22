import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {
  fullWalletForID,
  getEngine,
  viewOnlyWalletForID,
} from '../../core/engine';
import {
  createRailgunWallet,
  createViewOnlyRailgunWallet,
  getRailgunAddress,
  getRailgunWalletAddressData,
  getWalletMnemonic,
  getWalletShareableViewingKey,
  loadWalletByID,
  serializeRailgunWalletAddressData,
  unloadWalletByID,
  validateRailgunAddress,
} from '../wallets';
import {
  MOCK_DB_ENCRYPTION_KEY,
  MOCK_MNEMONIC_2,
} from '../../../../test/mocks.test';
import {
  initTestEngine,
  initTestEngineNetwork,
} from '../../../../test/setup.test';
import { RailgunWallet } from '@railgun-community/engine';
import { NetworkName } from '@railgun-community/shared-models';

chai.use(chaiAsPromised);
const { expect } = chai;

let wallet: RailgunWallet;

describe('wallets', () => {
  before(async () => {
    initTestEngine();
    await initTestEngineNetwork();
    const { railgunWalletInfo, error } = await createRailgunWallet(
      MOCK_DB_ENCRYPTION_KEY,
      MOCK_MNEMONIC_2,
      { [NetworkName.Ethereum]: 0, [NetworkName.Polygon]: 2 }, // creationBlockNumbers
    );
    if (!railgunWalletInfo) {
      throw new Error(`Could not create wallet: ${error}`);
    }
    wallet = fullWalletForID(railgunWalletInfo.id);
  });

  it('Should create view only wallet', async () => {
    const { railgunWalletInfo } = await createViewOnlyRailgunWallet(
      MOCK_DB_ENCRYPTION_KEY,
      await wallet.generateShareableViewingKey(),
      undefined, // creationBlockNumbers
    );
    if (!railgunWalletInfo) {
      throw new Error('Could not create view-only wallet');
    }
    const viewOnlyWallet = viewOnlyWalletForID(railgunWalletInfo.id);
    expect(viewOnlyWallet).to.not.be.undefined;
    expect(railgunWalletInfo.railgunAddress).to.equal(wallet.getAddress());
  });

  it('Should get wallet address', async () => {
    const addressAny = await getRailgunAddress(wallet.id);
    expect(addressAny).to.equal(
      '0zk1qykzjxctynyz4z43pukckpv43jyzhyvy0ehrd5wuc54l5enqf9qfrrv7j6fe3z53la7enqphqvxys9aqyp9xx0km95ehqslx8apmu8l7anc7emau4tvsultrkvd',
    );
  });

  it('Should get wallet shareable viewing key', async () => {
    const shareableKey = await getWalletShareableViewingKey(wallet.id);
    expect(shareableKey).to.equal(
      '82a57670726976d94032643030623234396632646337313236303565336263653364373665376631313931373933363436393365333931666566643963323764303161396262336433a473707562d94030633661376436386331663437303262613764666134613361353236323035303765386637366632393139326363666637653861366231303637393062316165',
    );
  });

  it('Should get wallet mnemonic', async () => {
    const mnemonic = await getWalletMnemonic(MOCK_DB_ENCRYPTION_KEY, wallet.id);
    expect(mnemonic).to.equal(MOCK_MNEMONIC_2);
  });

  it('Should create and load wallet from valid mnemonic', async () => {
    const response = await createRailgunWallet(
      MOCK_DB_ENCRYPTION_KEY,
      MOCK_MNEMONIC_2,
      undefined, // creationBlockNumbers
    );
    expect(response.railgunWalletInfo).to.not.be.undefined;
    expect(response.railgunWalletInfo?.id).to.be.a('string');
    expect(response.railgunWalletInfo?.railgunAddress).to.be.a('string');
    expect(response.railgunWalletInfo?.id).to.equal(wallet.id);

    const loadWalletResponse = await loadWalletByID(
      MOCK_DB_ENCRYPTION_KEY,
      response.railgunWalletInfo?.id ?? '',
      false, // isViewOnlyWallet
    );
    expect(loadWalletResponse.railgunWalletInfo).to.not.be.undefined;
    expect(loadWalletResponse.railgunWalletInfo?.id).to.equal(
      response.railgunWalletInfo?.id,
    );
    expect(loadWalletResponse.railgunWalletInfo?.railgunAddress).to.equal(
      response.railgunWalletInfo?.railgunAddress,
    );
  });

  it('Should load wallet from db after Engine wallet unload', async () => {
    expect(Object.keys(getEngine().wallets)).to.include(wallet.id);
    unloadWalletByID(wallet.id);
    expect(Object.keys(getEngine().wallets)).to.not.include(wallet.id);
    const loadWalletResponse = await loadWalletByID(
      MOCK_DB_ENCRYPTION_KEY,
      wallet.id,
      false, // isViewOnlyWallet
    );
    expect(loadWalletResponse.railgunWalletInfo).to.not.be.undefined;
    expect(loadWalletResponse.railgunWalletInfo?.id).to.equal(wallet.id);
    expect(loadWalletResponse.railgunWalletInfo?.railgunAddress).to.equal(
      wallet.getAddress(undefined),
    );
  });

  it('Should error for unknown load wallet', async () => {
    const loadWalletResponse = await loadWalletByID(
      MOCK_DB_ENCRYPTION_KEY,
      'unknown',
      false, // isViewOnlyWallet
    );
    expect(loadWalletResponse.error).to.include(
      'Could not load RAILGUN wallet',
    );
  });

  it('Should validate RAILGUN addresses', async () => {
    expect(validateRailgunAddress('0x9E9F988356f46744Ee0374A17a5Fa1a3A3cC3777'))
      .to.be.false;
    expect(validateRailgunAddress('9E9F988356f46744Ee0374A17a5Fa1a3A3cC3777'))
      .to.be.false;
    expect(
      validateRailgunAddress(
        'rgtestropsten1qyglk9smgj240x2xmj2laj7p5hexw0a30vvdqnv9gk020nsd7yzgwkgce9x',
      ),
    ).to.be.false;
    expect(
      validateRailgunAddress(
        '0zk1q8hxknrs97q8pjxaagwthzc0df99rzmhl2xnlxmgv9akv32sua0kfrv7j6fe3z53llhxknrs97q8pjxaagwthzc0df99rzmhl2xnlxmgv9akv32sua0kg0zpzts',
      ),
    ).to.be.true;
    expect(
      validateRailgunAddress(
        '0zk1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqunpd9kxwatwqyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhshkca',
      ),
    ).to.be.true;
  });

  it('Should serialize wallet address data', async () => {
    const addressData = getRailgunWalletAddressData(wallet.getAddress());
    const serializedAddressData =
      serializeRailgunWalletAddressData(addressData);
    expect(serializedAddressData.viewingPublicKey).to.equal(
      '7d998037030c4817a0204a633edb2d337043e63f43be1ffeecf1ecefbcaad90e',
    );
    expect(serializedAddressData.masterPublicKey).to.equal(
      '2c291b0b24c82a8ab10f2d8b05958c882b91847e6e36d1dcc52bfa6660494091',
    );
  });
});
