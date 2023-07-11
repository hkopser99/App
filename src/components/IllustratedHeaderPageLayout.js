import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {ScrollView, View} from 'react-native';
import Lottie from 'lottie-react-native';
import headerWithBackButtonPropTypes from './HeaderWithBackButton/headerWithBackButtonPropTypes';
import HeaderWithBackButton from './HeaderWithBackButton';
import ScreenWrapper from './ScreenWrapper';
import styles from '../styles/styles';
import themeColors from '../styles/themes/default';
import * as StyleUtils from '../styles/StyleUtils';
import useWindowDimensions from '../hooks/useWindowDimensions';

const propTypes = {
    ...headerWithBackButtonPropTypes,

    children: PropTypes.node.isRequired,

    /** The background color to apply in the upper half of the screen. */
    backgroundColor: PropTypes.string.isRequired,

    /** The illustration to display in the header. Can be either an SVG component or a JSON object representing a Lottie animation. */
    illustration: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired,
};

function IllustratedHeaderPageLayout({backgroundColor, children, illustration, ...propsToPassToHeader}) {
    const {windowHeight} = useWindowDimensions();
    const [overscrollSpacerHeight, setOverscrollSpacerHeight] = useState(windowHeight / 2);
    return (
        <ScreenWrapper
            style={[StyleUtils.getBackgroundColorStyle(backgroundColor)]}
            shouldEnablePickerAvoiding={false}
            includeSafeAreaPaddingBottom={false}
        >
            {({safeAreaPaddingBottomStyle}) => (
                <>
                    <HeaderWithBackButton
                        // eslint-disable-next-line react/jsx-props-no-spreading
                        {...propsToPassToHeader}
                        backgroundColor={backgroundColor}
                    />
                    <ScrollView
                        contentContainerStyle={safeAreaPaddingBottomStyle}
                        onScroll={(event) => {
                            const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
                            const overscrollBottom = Math.ceil(layoutMeasurement.height + contentOffset.y) - contentSize.height;
                            if (overscrollBottom < 0) {
                                return;
                            }
                            setOverscrollSpacerHeight(() => windowHeight / 2 + overscrollBottom);
                        }}
                        scrollEventThrottle={80}
                    >
                        <View style={[styles.alignItemsCenter, styles.justifyContentEnd]}>
                            <Lottie
                                source={illustration}
                                style={styles.w100}
                                autoPlay
                                loop
                            />
                        </View>
                        <View style={[styles.flex1, styles.pt5, StyleUtils.getBackgroundColorStyle(themeColors.appBG)]}>{children}</View>
                    </ScrollView>
                    <View
                        style={{
                            backgroundColor: themeColors.appBG,
                            height: overscrollSpacerHeight,
                            width: '100%',
                            position: 'absolute',
                            bottom: 0,
                            zIndex: -1,
                        }}
                    />
                </>
            )}
        </ScreenWrapper>
    );
}

IllustratedHeaderPageLayout.propTypes = propTypes;
IllustratedHeaderPageLayout.displayName = 'IllustratedHeaderPageLayout';

export default IllustratedHeaderPageLayout;
