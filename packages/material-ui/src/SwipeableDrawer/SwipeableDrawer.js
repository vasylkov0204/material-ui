// @inheritedComponent Drawer

import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { elementTypeAcceptingRef } from '@material-ui/utils';
import Drawer, { getAnchor, isHorizontal } from '../Drawer/Drawer';
import { duration } from '../styles/transitions';
import withTheme from '../styles/withTheme';
import { getTransitionProps } from '../transitions/utils';
import NoSsr from '../NoSsr';
import SwipeArea from './SwipeArea';
import { useForkRef } from '@material-ui/core/utils/reactHelpers';

// This value is closed to what browsers are using internally to
// trigger a native scroll.
const UNCERTAINTY_THRESHOLD = 3; // px

// We can only have one node at the time claiming ownership for handling the swipe.
// Otherwise, the UX would be confusing.
// That's why we use a singleton here.
let nodeThatClaimedTheSwipe = null;

// Exported for test purposes.
export function reset() {
  nodeThatClaimedTheSwipe = null;
}

const SwipeableDrawer = React.forwardRef(function SwipeableDrawer(props, ref) {
  const {
    anchor,
    disableBackdropTransition,
    disableDiscovery,
    disableSwipeToOpen,
    hideBackdrop,
    hysteresis,
    minFlingVelocity,
    ModalProps: { BackdropProps, ...ModalPropsProp } = {},
    onOpen,
    onClose,
    open,
    PaperProps = {},
    SwipeAreaProps,
    swipeAreaWidth,
    theme,
    transitionDuration,
    variant,
    ...other
  } = props;

  const isSwiping = React.useRef();
  const startX = React.useRef();
  const startY = React.useRef();
  const velocity = React.useRef();
  const lastTime = React.useRef();
  const lastTranslate = React.useRef();

  const swipeAreaRef = React.useRef();
  const paperRef = React.useRef();
  const backdropRef = React.useRef();
  const drawerRef = React.useRef();
  const handleDrawerRef = useForkRef(drawerRef, ref);

  const [maybeSwiping, setMaybeSwiping] = React.useState(false);

  if (!open && maybeSwiping) {
    setMaybeSwiping(false);
  }

  const handleBodyTouchMoveRef = React.useRef();
  const handleBodyTouchEndRef = React.useRef();

  const removeBodyTouchListeners = React.useCallback(() => {
    document.body.removeEventListener('touchmove', handleBodyTouchMoveRef.current, {
      passive: false,
    });
    document.body.removeEventListener('touchend', handleBodyTouchEndRef.current);
    document.body.removeEventListener('touchcancel', handleBodyTouchEndRef.current);
  }, []);

  const getMaxTranslate = React.useCallback(() => {
    return isHorizontal(props) ? paperRef.current.clientWidth : paperRef.current.clientHeight;
  }, [props]);

  const getTranslate = React.useCallback(
    current => {
      const start = isHorizontal(props) ? startX.current : startY.current;
      const maxTranslate = getMaxTranslate();
      return Math.min(
        Math.max(open ? start - current : maxTranslate + start - current, 0),
        maxTranslate,
      );
    },
    [getMaxTranslate, open, props],
  );

  const setPosition = React.useCallback(
    (translate, options = {}) => {
      const { mode = null, changeTransition = true } = options;

      const currentAnchor = getAnchor(props);
      const rtlTranslateMultiplier = ['right', 'bottom'].indexOf(currentAnchor) !== -1 ? 1 : -1;
      const transform = isHorizontal(props)
        ? `translate(${rtlTranslateMultiplier * translate}px, 0)`
        : `translate(0, ${rtlTranslateMultiplier * translate}px)`;
      const drawerStyle = paperRef.current.style;
      drawerStyle.webkitTransform = transform;
      drawerStyle.transform = transform;

      let transition = '';

      if (mode) {
        transition = theme.transitions.create(
          'all',
          getTransitionProps(
            {
              timeout: transitionDuration,
            },
            {
              mode,
            },
          ),
        );
      }

      if (changeTransition) {
        drawerStyle.webkitTransition = transition;
        drawerStyle.transition = transition;
      }

      if (!disableBackdropTransition && !hideBackdrop) {
        const backdropStyle = backdropRef.current.style;
        backdropStyle.opacity = 1 - translate / getMaxTranslate();

        if (changeTransition) {
          backdropStyle.webkitTransition = transition;
          backdropStyle.transition = transition;
        }
      }
    },
    [
      disableBackdropTransition,
      getMaxTranslate,
      hideBackdrop,
      props,
      theme.transitions,
      transitionDuration,
    ],
  );

  const handleBodyTouchEnd = React.useCallback(
    event => {
      nodeThatClaimedTheSwipe = drawerRef;
      removeBodyTouchListeners();
      setMaybeSwiping(false);

      // The swipe wasn't started.
      if (!isSwiping.current) {
        isSwiping.current = null;
        return;
      }

      isSwiping.current = null;

      const currentAnchor = getAnchor(props);
      let current;
      if (isHorizontal(props)) {
        current =
          currentAnchor === 'right'
            ? document.body.offsetWidth - event.changedTouches[0].pageX
            : event.changedTouches[0].pageX;
      } else {
        current =
          currentAnchor === 'bottom'
            ? window.innerHeight - event.changedTouches[0].clientY
            : event.changedTouches[0].clientY;
      }

      const translateRatio = getTranslate(current) / getMaxTranslate();

      if (open) {
        if (velocity.current > minFlingVelocity || translateRatio > hysteresis) {
          onClose();
        } else {
          // Reset the position, the swipe was aborted.
          setPosition(0, {
            mode: 'exit',
          });
        }

        return;
      }

      if (velocity.current < -minFlingVelocity || 1 - translateRatio > hysteresis) {
        onOpen();
      } else {
        // Reset the position, the swipe was aborted.
        setPosition(getMaxTranslate(), {
          mode: 'enter',
        });
      }
    },
    [
      getMaxTranslate,
      getTranslate,
      hysteresis,
      minFlingVelocity,
      onClose,
      onOpen,
      open,
      props,
      removeBodyTouchListeners,
      setPosition,
    ],
  );

  const handleBodyTouchMove = React.useCallback(
    event => {
      // the ref may be null when a parent component updates while swiping
      if (!paperRef.current) return;

      const currentAnchor = getAnchor(props);
      const horizontalSwipe = isHorizontal(props);

      const currentX =
        currentAnchor === 'right'
          ? document.body.offsetWidth - event.touches[0].pageX
          : event.touches[0].pageX;
      const currentY =
        currentAnchor === 'bottom'
          ? window.innerHeight - event.touches[0].clientY
          : event.touches[0].clientY;

      // We don't know yet.
      if (isSwiping.current == null) {
        const dx = Math.abs(currentX - startX.current);
        const dy = Math.abs(currentY - startY.current);

        // We are likely to be swiping, let's prevent the scroll event on iOS.
        if (dx > dy) {
          event.preventDefault();
        }

        const currentlyIsSwiping = horizontalSwipe
          ? dx > dy && dx > UNCERTAINTY_THRESHOLD
          : dy > dx && dy > UNCERTAINTY_THRESHOLD;

        if (
          currentlyIsSwiping === true ||
          (horizontalSwipe ? dy > UNCERTAINTY_THRESHOLD : dx > UNCERTAINTY_THRESHOLD)
        ) {
          isSwiping.current = currentlyIsSwiping;
          if (!currentlyIsSwiping) {
            handleBodyTouchEnd(event);
            return;
          }

          // Shift the starting point.
          startX.current = currentX;
          startY.current = currentY;

          // Compensate for the part of the drawer displayed on touch start.
          if (!disableDiscovery && !open) {
            if (horizontalSwipe) {
              startX.current -= swipeAreaWidth;
            } else {
              startY.current -= swipeAreaWidth;
            }
          }
        }
      }

      if (!isSwiping.current) {
        return;
      }

      const translate = getTranslate(horizontalSwipe ? currentX : currentY);

      if (lastTranslate.current === null) {
        lastTranslate.current = translate;
        lastTime.current = performance.now() + 1;
      }

      const currentVelocity =
        ((translate - lastTranslate.current) / (performance.now() - lastTime.current)) * 1e3;

      // Low Pass filter.
      velocity.current = velocity.current * 0.4 + currentVelocity * 0.6;

      lastTranslate.current = translate;
      lastTime.current = performance.now();

      // We are swiping, let's prevent the scroll event on iOS.
      event.preventDefault();
      setPosition(translate);
    },
    [disableDiscovery, getTranslate, handleBodyTouchEnd, open, props, setPosition, swipeAreaWidth],
  );

  const handleBodyTouchStart = React.useCallback(
    event => {
      // We are not supposed to handle this touch move.
      if (nodeThatClaimedTheSwipe !== null && nodeThatClaimedTheSwipe !== drawerRef) {
        return;
      }

      const currentAnchor = getAnchor(props);
      const currentX =
        currentAnchor === 'right'
          ? document.body.offsetWidth - event.touches[0].pageX
          : event.touches[0].pageX;
      const currentY =
        currentAnchor === 'bottom'
          ? window.innerHeight - event.touches[0].clientY
          : event.touches[0].clientY;

      if (!open) {
        if (disableSwipeToOpen || event.target !== swipeAreaRef.current) {
          return;
        }
        if (isHorizontal(props)) {
          if (currentX > swipeAreaWidth) {
            return;
          }
        } else if (currentY > swipeAreaWidth) {
          return;
        }
      }

      nodeThatClaimedTheSwipe = drawerRef;
      startX.current = currentX;
      startY.current = currentY;

      setMaybeSwiping(true);
      if (!open && paperRef.current) {
        // The ref may be null when a parent component updates while swiping.
        setPosition(getMaxTranslate() + (disableDiscovery ? 20 : -swipeAreaWidth), {
          changeTransition: false,
        });
      }

      velocity.current = 0;
      lastTime.current = null;
      lastTranslate.current = null;

      handleBodyTouchMoveRef.current = handleBodyTouchMove;
      handleBodyTouchEndRef.current = handleBodyTouchEnd;
      document.body.addEventListener('touchmove', handleBodyTouchMove, { passive: false });
      document.body.addEventListener('touchend', handleBodyTouchEnd);
      // https://plus.google.com/+PaulIrish/posts/KTwfn1Y2238
      document.body.addEventListener('touchcancel', handleBodyTouchEnd);
    },
    [
      disableDiscovery,
      disableSwipeToOpen,
      getMaxTranslate,
      handleBodyTouchEnd,
      handleBodyTouchMove,
      open,
      props,
      setPosition,
      swipeAreaWidth,
    ],
  );

  const handleBackdropRef = instance => {
    // #StrictMode ready
    backdropRef.current = ReactDOM.findDOMNode(instance);
  };

  const handlePaperRef = instance => {
    // #StrictMode ready
    paperRef.current = ReactDOM.findDOMNode(instance);
  };

  const listenTouchStart = React.useCallback(() => {
    document.body.addEventListener('touchstart', handleBodyTouchStart);
  }, [handleBodyTouchStart]);

  const removeTouchStart = React.useCallback(() => {
    document.body.removeEventListener('touchstart', handleBodyTouchStart);
  }, [handleBodyTouchStart]);

  React.useEffect(() => {
    if (variant === 'temporary') {
      listenTouchStart();
    } else if (variant !== 'temporary') {
      removeTouchStart();
    }
  }, [listenTouchStart, removeTouchStart, variant]);

  React.useEffect(() => {
    return () => {
      removeTouchStart();
      removeBodyTouchListeners();

      // We need to release the lock.
      if (nodeThatClaimedTheSwipe === drawerRef) {
        nodeThatClaimedTheSwipe = null;
      }
    };
  }, [removeBodyTouchListeners, removeTouchStart]);

  return (
    <React.Fragment>
      <Drawer
        open={variant === 'temporary' && maybeSwiping ? true : open}
        variant={variant}
        ModalProps={{
          BackdropProps: {
            ...BackdropProps,
            ref: handleBackdropRef,
          },
          ...ModalPropsProp,
        }}
        PaperProps={{
          ...PaperProps,
          style: {
            pointerEvents: variant === 'temporary' && !open ? 'none' : '',
            ...PaperProps.style,
          },
          ref: handlePaperRef,
        }}
        anchor={anchor}
        ref={handleDrawerRef}
        hideBackdrop={hideBackdrop}
        onClose={onClose}
        transitionDuration={transitionDuration}
        {...other}
      />
      {!disableSwipeToOpen && variant === 'temporary' && (
        <NoSsr>
          <SwipeArea
            anchor={anchor}
            ref={swipeAreaRef}
            width={swipeAreaWidth}
            {...SwipeAreaProps}
          />
        </NoSsr>
      )}
    </React.Fragment>
  );
});

SwipeableDrawer.propTypes = {
  /**
   * @ignore
   */
  anchor: PropTypes.oneOf(['left', 'top', 'right', 'bottom']),
  /**
   * Disable the backdrop transition.
   * This can improve the FPS on low-end devices.
   */
  disableBackdropTransition: PropTypes.bool,
  /**
   * If `true`, touching the screen near the edge of the drawer will not slide in the drawer a bit
   * to promote accidental discovery of the swipe gesture.
   */
  disableDiscovery: PropTypes.bool,
  /**
   * If `true`, swipe to open is disabled. This is useful in browsers where swiping triggers
   * navigation actions. Swipe to open is disabled on iOS browsers by default.
   */
  disableSwipeToOpen: PropTypes.bool,
  /**
   * @ignore
   */
  hideBackdrop: PropTypes.bool,
  /**
   * Affects how far the drawer must be opened/closed to change his state.
   * Specified as percent (0-1) of the width of the drawer
   */
  hysteresis: PropTypes.number,
  /**
   * Defines, from which (average) velocity on, the swipe is
   * defined as complete although hysteresis isn't reached.
   * Good threshold is between 250 - 1000 px/s
   */
  minFlingVelocity: PropTypes.number,
  /**
   * @ignore
   */
  ModalProps: PropTypes.shape({
    BackdropProps: PropTypes.shape({
      component: elementTypeAcceptingRef,
    }),
  }),
  /**
   * Callback fired when the component requests to be closed.
   *
   * @param {object} event The event source of the callback
   */
  onClose: PropTypes.func.isRequired,
  /**
   * Callback fired when the component requests to be opened.
   *
   * @param {object} event The event source of the callback
   */
  onOpen: PropTypes.func.isRequired,
  /**
   * If `true`, the drawer is open.
   */
  open: PropTypes.bool.isRequired,
  /**
   * @ignore
   */
  PaperProps: PropTypes.shape({
    component: elementTypeAcceptingRef,
  }),
  /**
   * Properties applied to the swipe area element.
   */
  SwipeAreaProps: PropTypes.object,
  /**
   * The width of the left most (or right most) area in pixels where the
   * drawer can be swiped open from.
   */
  swipeAreaWidth: PropTypes.number,
  /**
   * @ignore
   */
  theme: PropTypes.object.isRequired,
  /**
   * The duration for the transition, in milliseconds.
   * You may specify a single timeout for all transitions, or individually with an object.
   */
  transitionDuration: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({ enter: PropTypes.number, exit: PropTypes.number }),
  ]),
  /**
   * @ignore
   */
  variant: PropTypes.oneOf(['permanent', 'persistent', 'temporary']),
};

SwipeableDrawer.defaultProps = {
  anchor: 'left',
  disableBackdropTransition: false,
  disableDiscovery: false,
  disableSwipeToOpen:
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  hysteresis: 0.55,
  minFlingVelocity: 400,
  swipeAreaWidth: 20,
  transitionDuration: { enter: duration.enteringScreen, exit: duration.leavingScreen },
  variant: 'temporary', // Mobile first.
};

export default withTheme(SwipeableDrawer);
