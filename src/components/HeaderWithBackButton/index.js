import React from 'react';
import {View, Keyboard} from 'react-native';
import CONST from '../../CONST';
import styles from '../../styles/styles';
import themeColors from '../../styles/themes/default';
import Header from '../Header';
import Navigation from '../../libs/Navigation/Navigation';
import ROUTES from '../../ROUTES';
import Icon from '../Icon';
import * as Expensicons from '../Icon/Expensicons';
import Tooltip from '../Tooltip';
import getButtonState from '../../libs/getButtonState';
import * as StyleUtils from '../../styles/StyleUtils';
import ThreeDotsMenu from '../ThreeDotsMenu';
import AvatarWithDisplayName from '../AvatarWithDisplayName';
import PressableWithoutFeedback from '../Pressable/PressableWithoutFeedback';
import PinButton from '../PinButton';
import headerWithBackButtonPropTypes from './headerWithBackButtonPropTypes';
import useDelayToggleButtonState from '../../hooks/useDelayToggleButtonState';
import useLocalize from '../../hooks/useLocalize';
import useKeyboardState from '../../hooks/useKeyboardState';

function HeaderWithBackButton({
    backgroundColor = themeColors.appBG,
    guidesCallTaskID = '',
    onBackButtonPress = () => Navigation.goBack(),
    onCloseButtonPress = () => Navigation.dismissModal(),
    onDownloadButtonPress = () => {},
    onThreeDotsButtonPress = () => {},
    report = null,
    parentReport = null,
    policies = {},
    personalDetails = {},
    shouldShowAvatarWithDisplay = false,
    shouldShowBackButton = true,
    shouldShowBorderBottom = false,
    shouldShowCloseButton = false,
    shouldShowDownloadButton = false,
    shouldShowGetAssistanceButton = false,
    shouldShowPinButton = false,
    shouldShowStepCounter = false,
    shouldShowThreeDotsButton = false,
    stepCounter = null,
    subtitle = '',
    title = '',
    threeDotsAnchorAlignment = {
        horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT,
        vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP,
    },
    threeDotsAnchorPosition = {
        vertical: 0,
        horizontal: 0,
    },
    threeDotsMenuItems = [],
}) {
    const [isDelayButtonStateComplete, toggleDelayButtonState] = useDelayToggleButtonState();
    const {translate} = useLocalize();
    const {isKeyboardShown} = useKeyboardState();
    return (
        <View style={[styles.headerBar, StyleUtils.getBackgroundColorStyle(backgroundColor), shouldShowBorderBottom && styles.borderBottom, shouldShowBackButton && styles.pl2]}>
            <View style={[styles.dFlex, styles.flexRow, styles.alignItemsCenter, styles.flexGrow1, styles.justifyContentBetween, styles.overflowHidden]}>
                {shouldShowBackButton && (
                    <Tooltip text={translate('common.back')}>
                        <PressableWithoutFeedback
                            onPress={() => {
                                if (isKeyboardShown) {
                                    Keyboard.dismiss();
                                }
                                onBackButtonPress();
                            }}
                            style={[styles.touchableButtonImage]}
                            accessibilityRole="button"
                            accessibilityLabel={translate('common.back')}
                        >
                            <Icon src={Expensicons.BackArrow} />
                        </PressableWithoutFeedback>
                    </Tooltip>
                )}
                {shouldShowAvatarWithDisplay && (
                    <AvatarWithDisplayName
                        report={parentReport || report}
                        policies={policies}
                        personalDetails={personalDetails}
                    />
                )}
                {!shouldShowAvatarWithDisplay && (
                    <Header
                        title={title}
                        subtitle={stepCounter && shouldShowStepCounter ? translate('stepCounter', stepCounter) : subtitle}
                    />
                )}
                <View style={[styles.reportOptions, styles.flexRow, styles.pr5]}>
                    {shouldShowDownloadButton && (
                        <Tooltip text={translate('common.download')}>
                            <PressableWithoutFeedback
                                onPress={(e) => {
                                    // Blur the pressable in case this button triggers a Growl notification
                                    // We do not want to overlap Growl with the Tooltip (#15271)
                                    e.currentTarget.blur();

                                    if (isDelayButtonStateComplete) {
                                        return;
                                    }

                                    onDownloadButtonPress();
                                    toggleDelayButtonState(true);
                                }}
                                style={[styles.touchableButtonImage]}
                                accessibilityRole="button"
                                accessibilityLabel={translate('common.download')}
                            >
                                <Icon
                                    src={Expensicons.Download}
                                    fill={StyleUtils.getIconFillColor(getButtonState(false, false, isDelayButtonStateComplete))}
                                />
                            </PressableWithoutFeedback>
                        </Tooltip>
                    )}

                    {shouldShowGetAssistanceButton && (
                        <Tooltip text={translate('getAssistancePage.questionMarkButtonTooltip')}>
                            <PressableWithoutFeedback
                                onPress={() => Navigation.navigate(ROUTES.getGetAssistanceRoute(guidesCallTaskID))}
                                style={[styles.touchableButtonImage]}
                                accessibilityRole="button"
                                accessibilityLabel={translate('getAssistancePage.questionMarkButtonTooltip')}
                            >
                                <Icon src={Expensicons.QuestionMark} />
                            </PressableWithoutFeedback>
                        </Tooltip>
                    )}

                    {shouldShowPinButton && <PinButton report={report} />}

                    {shouldShowThreeDotsButton && (
                        <ThreeDotsMenu
                            menuItems={threeDotsMenuItems}
                            onIconPress={onThreeDotsButtonPress}
                            anchorPosition={threeDotsAnchorPosition}
                            anchorAlignment={threeDotsAnchorAlignment}
                        />
                    )}

                    {shouldShowCloseButton && (
                        <Tooltip text={translate('common.close')}>
                            <PressableWithoutFeedback
                                onPress={onCloseButtonPress}
                                style={[styles.touchableButtonImage]}
                                accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                                accessibilityLabel={translate('common.close')}
                            >
                                <Icon src={Expensicons.Close} />
                            </PressableWithoutFeedback>
                        </Tooltip>
                    )}
                </View>
            </View>
        </View>
    );
}

HeaderWithBackButton.propTypes = headerWithBackButtonPropTypes;
HeaderWithBackButton.displayName = 'HeaderWithBackButton';

export default HeaderWithBackButton;
