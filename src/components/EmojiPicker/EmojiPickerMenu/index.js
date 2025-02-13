import lodashGet from 'lodash/get';
import PropTypes from 'prop-types';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {scrollTo} from 'react-native-reanimated';
import _ from 'underscore';
import EmojiPickerMenuItem from '@components/EmojiPicker/EmojiPickerMenuItem';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useArrowKeyFocusManager from '@hooks/useArrowKeyFocusManager';
import useLocalize from '@hooks/useLocalize';
import useSingleExecution from '@hooks/useSingleExecution';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';
import useWindowDimensions from '@hooks/useWindowDimensions';
import * as Browser from '@libs/Browser';
import canFocusInputOnScreenFocus from '@libs/canFocusInputOnScreenFocus';
import isEnterWhileComposition from '@libs/KeyboardShortcut/isEnterWhileComposition';
import * as ReportUtils from '@libs/ReportUtils';
import CONST from '@src/CONST';
import BaseEmojiPickerMenu from './BaseEmojiPickerMenu';
import emojiPickerMenuPropTypes from './emojiPickerMenuPropTypes';
import useEmojiPickerMenu from './useEmojiPickerMenu';

const propTypes = {
    /** The ref to the search input (may be null on small screen widths) */
    forwardedRef: PropTypes.func,
    ...emojiPickerMenuPropTypes,
};

const defaultProps = {
    forwardedRef: () => {},
};

const throttleTime = Browser.isMobile() ? 200 : 50;

function EmojiPickerMenu({forwardedRef, onEmojiSelected}) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {isSmallScreenWidth, windowWidth} = useWindowDimensions();
    const {translate} = useLocalize();
    const {singleExecution} = useSingleExecution();
    const {
        allEmojis,
        headerEmojis,
        headerRowIndices,
        filteredEmojis,
        headerIndices,
        setFilteredEmojis,
        setHeaderIndices,
        isListFiltered,
        suggestEmojis,
        preferredSkinTone,
        listStyle,
        emojiListRef,
        spacersIndexes,
    } = useEmojiPickerMenu();

    // Ref for the emoji search input
    const searchInputRef = useRef(null);

    // We want consistent auto focus behavior on input between native and mWeb so we have some auto focus management code that will
    // prevent auto focus when open picker for mobile device
    const shouldFocusInputOnScreenFocus = canFocusInputOnScreenFocus();

    const [arePointerEventsDisabled, setArePointerEventsDisabled] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isUsingKeyboardMovement, setIsUsingKeyboardMovement] = useState(false);
    const [highlightEmoji, setHighlightEmoji] = useState(false);
    const [highlightFirstEmoji, setHighlightFirstEmoji] = useState(false);

    const mouseMoveHandler = useCallback(() => {
        if (!arePointerEventsDisabled) {
            return;
        }
        setArePointerEventsDisabled(false);
    }, [arePointerEventsDisabled]);

    const onFocusedIndexChange = useCallback(
        (newIndex) => {
            if (filteredEmojis.length === 0) {
                return;
            }

            if (highlightFirstEmoji) {
                setHighlightFirstEmoji(false);
            }

            if (!isUsingKeyboardMovement) {
                setIsUsingKeyboardMovement(true);
            }

            // If the input is not focused and the new index is out of range, focus the input
            if (newIndex < 0 && !searchInputRef.current.isFocused() && shouldFocusInputOnScreenFocus) {
                searchInputRef.current.focus();
            }
        },
        [filteredEmojis.length, highlightFirstEmoji, isUsingKeyboardMovement, shouldFocusInputOnScreenFocus],
    );

    const disabledIndexes = useMemo(() => (isListFiltered ? [] : [...headerIndices, ...spacersIndexes]), [headerIndices, isListFiltered, spacersIndexes]);

    const [focusedIndex, setFocusedIndex] = useArrowKeyFocusManager({
        maxIndex: filteredEmojis.length - 1,
        // Spacers indexes need to be disabled so that the arrow keys don't focus them. All headers are hidden when list is filtered
        disabledIndexes,
        itemsPerRow: CONST.EMOJI_NUM_PER_ROW,
        initialFocusedIndex: -1,
        disableCyclicTraversal: true,
        onFocusedIndexChange,
    });

    const filterEmojis = _.throttle((searchTerm) => {
        const [normalizedSearchTerm, newFilteredEmojiList] = suggestEmojis(searchTerm);

        if (emojiListRef.current) {
            scrollTo(emojiListRef, 0, 0, false);
        }
        if (normalizedSearchTerm === '') {
            // There are no headers when searching, so we need to re-make them sticky when there is no search term
            setFilteredEmojis(allEmojis);
            setHeaderIndices(headerRowIndices);
            setFocusedIndex(-1);
            setHighlightEmoji(false);
            return;
        }
        // Remove sticky header indices. There are no headers while searching and we don't want to make emojis sticky
        setFilteredEmojis(newFilteredEmojiList);
        setHeaderIndices([]);
        setHighlightFirstEmoji(true);
        setIsUsingKeyboardMovement(false);
    }, throttleTime);

    const keyDownHandler = useCallback(
        (keyBoardEvent) => {
            if (keyBoardEvent.key.startsWith('Arrow')) {
                if (!isFocused || keyBoardEvent.key === 'ArrowUp' || keyBoardEvent.key === 'ArrowDown') {
                    keyBoardEvent.preventDefault();
                }

                return;
            }

            // Select the currently highlighted emoji if enter is pressed
            if (!isEnterWhileComposition(keyBoardEvent) && keyBoardEvent.key === CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey) {
                let indexToSelect = focusedIndex;
                if (highlightFirstEmoji) {
                    indexToSelect = 0;
                }

                const item = filteredEmojis[indexToSelect];
                if (!item) {
                    return;
                }
                const emoji = lodashGet(item, ['types', preferredSkinTone], item.code);
                onEmojiSelected(emoji, item);
                // On web, avoid this Enter default input action; otherwise, it will add a new line in the subsequently focused composer.
                keyBoardEvent.preventDefault();
                // On mWeb, avoid propagating this Enter keystroke to Pressable child component; otherwise, it will trigger the onEmojiSelected callback again.
                keyBoardEvent.stopPropagation();
                return;
            }

            // Enable keyboard movement if tab or enter is pressed or if shift is pressed while the input
            // is not focused, so that the navigation and tab cycling can be done using the keyboard without
            // interfering with the input behaviour.
            if (keyBoardEvent.key === 'Tab' || keyBoardEvent.key === 'Enter' || (keyBoardEvent.key === 'Shift' && searchInputRef.current && !searchInputRef.current.isFocused())) {
                setIsUsingKeyboardMovement(true);
            }

            // We allow typing in the search box if any key is pressed apart from Arrow keys.
            if (searchInputRef.current && !searchInputRef.current.isFocused() && ReportUtils.shouldAutoFocusOnKeyPress(keyBoardEvent)) {
                searchInputRef.current.focus();
            }
        },
        [filteredEmojis, focusedIndex, highlightFirstEmoji, isFocused, onEmojiSelected, preferredSkinTone],
    );

    /**
     * Setup and attach keypress/mouse handlers for highlight navigation.
     */
    const setupEventHandlers = useCallback(() => {
        if (!document) {
            return;
        }

        // Keyboard events are not bubbling on TextInput in RN-Web, Bubbling was needed for this event to trigger
        // event handler attached to document root. To fix this, trigger event handler in Capture phase.
        document.addEventListener('keydown', keyDownHandler, true);

        // Re-enable pointer events and hovering over EmojiPickerItems when the mouse moves
        document.addEventListener('mousemove', mouseMoveHandler);
    }, [keyDownHandler, mouseMoveHandler]);

    /**
     * Cleanup all mouse/keydown event listeners that we've set up
     */
    const cleanupEventHandlers = useCallback(() => {
        if (!document) {
            return;
        }

        document.removeEventListener('keydown', keyDownHandler, true);
        document.removeEventListener('mousemove', mouseMoveHandler);
    }, [keyDownHandler, mouseMoveHandler]);

    useEffect(() => {
        // This callback prop is used by the parent component using the constructor to
        // get a ref to the inner textInput element e.g. if we do
        // <constructor ref={el => this.textInput = el} /> this will not
        // return a ref to the component, but rather the HTML element by default
        if (shouldFocusInputOnScreenFocus && forwardedRef && _.isFunction(forwardedRef)) {
            forwardedRef(searchInputRef.current);
        }

        setupEventHandlers();

        return () => {
            cleanupEventHandlers();
        };
    }, [forwardedRef, shouldFocusInputOnScreenFocus, cleanupEventHandlers, setupEventHandlers]);

    const scrollToHeader = useCallback(
        (headerIndex) => {
            if (!emojiListRef.current) {
                return;
            }

            const calculatedOffset = Math.floor(headerIndex / CONST.EMOJI_NUM_PER_ROW) * CONST.EMOJI_PICKER_HEADER_HEIGHT;
            scrollTo(emojiListRef, 0, calculatedOffset, true);
        },
        [emojiListRef],
    );

    /**
     * Given an emoji item object, render a component based on its type.
     * Items with the code "SPACER" return nothing and are used to fill rows up to 8
     * so that the sticky headers function properly.
     *
     * @param {Object} item
     * @param {Number} index
     * @returns {*}
     */
    const renderItem = useCallback(
        ({item, index, target}) => {
            const {code, types} = item;
            if (item.spacer) {
                return null;
            }

            if (item.header) {
                return (
                    <View style={[styles.emojiHeaderContainer, target === 'StickyHeader' ? styles.stickyHeaderEmoji(isSmallScreenWidth, windowWidth) : undefined]}>
                        <Text style={styles.textLabelSupporting}>{translate(`emojiPicker.headers.${code}`)}</Text>
                    </View>
                );
            }

            const emojiCode = types && types[preferredSkinTone] ? types[preferredSkinTone] : code;

            const isEmojiFocused = index === focusedIndex && isUsingKeyboardMovement;
            const shouldEmojiBeHighlighted = index === focusedIndex && highlightEmoji;
            const shouldFirstEmojiBeHighlighted = index === 0 && highlightFirstEmoji;

            return (
                <EmojiPickerMenuItem
                    onPress={singleExecution((emoji) => onEmojiSelected(emoji, item))}
                    onHoverIn={() => {
                        setHighlightEmoji(false);
                        setHighlightFirstEmoji(false);
                        if (!isUsingKeyboardMovement) {
                            return;
                        }
                        setIsUsingKeyboardMovement(false);
                    }}
                    emoji={emojiCode}
                    onFocus={() => setFocusedIndex(index)}
                    isFocused={isEmojiFocused}
                    isHighlighted={shouldFirstEmojiBeHighlighted || shouldEmojiBeHighlighted}
                />
            );
        },
        [
            preferredSkinTone,
            focusedIndex,
            isUsingKeyboardMovement,
            highlightEmoji,
            highlightFirstEmoji,
            singleExecution,
            styles,
            isSmallScreenWidth,
            windowWidth,
            translate,
            onEmojiSelected,
            setFocusedIndex,
        ],
    );

    return (
        <View
            style={[
                styles.emojiPickerContainer,
                StyleUtils.getEmojiPickerStyle(isSmallScreenWidth),
                // Disable pointer events so that onHover doesn't get triggered when the items move while we're scrolling
                arePointerEventsDisabled ? styles.pointerEventsNone : styles.pointerEventsAuto,
            ]}
        >
            <View style={[styles.ph4, styles.pb3, styles.pt2]}>
                <TextInput
                    label={translate('common.search')}
                    accessibilityLabel={translate('common.search')}
                    role={CONST.ROLE.PRESENTATION}
                    onChangeText={filterEmojis}
                    defaultValue=""
                    ref={searchInputRef}
                    autoFocus={shouldFocusInputOnScreenFocus}
                    onFocus={() => {
                        setFocusedIndex(-1);
                        setIsFocused(true);
                        setIsUsingKeyboardMovement(false);
                    }}
                    onBlur={() => setIsFocused(false)}
                    autoCorrect={false}
                    blurOnSubmit={filteredEmojis.length > 0}
                />
            </View>
            <BaseEmojiPickerMenu
                isFiltered={isListFiltered}
                headerEmojis={headerEmojis}
                scrollToHeader={scrollToHeader}
                listWrapperStyle={[
                    listStyle,
                    // Set scrollPaddingTop to consider sticky headers while scrolling
                    {scrollPaddingTop: isListFiltered ? 0 : CONST.EMOJI_PICKER_ITEM_HEIGHT},
                    styles.flexShrink1,
                ]}
                ref={emojiListRef}
                data={filteredEmojis}
                renderItem={renderItem}
                extraData={[focusedIndex, preferredSkinTone]}
                stickyHeaderIndices={headerIndices}
            />
        </View>
    );
}

EmojiPickerMenu.displayName = 'EmojiPickerMenu';
EmojiPickerMenu.propTypes = propTypes;
EmojiPickerMenu.defaultProps = defaultProps;

const EmojiPickerMenuWithRef = React.forwardRef((props, ref) => (
    <EmojiPickerMenu
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
        forwardedRef={ref}
    />
));

EmojiPickerMenuWithRef.displayName = 'EmojiPickerMenuWithRef';

export default EmojiPickerMenuWithRef;
