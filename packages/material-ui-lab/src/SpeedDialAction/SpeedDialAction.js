// @inheritedComponent Tooltip

import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { emphasize, withStyles } from '@material-ui/core/styles';
import Fab from '@material-ui/core/Fab';
import Tooltip from '@material-ui/core/Tooltip';
import { withForwardedRef } from '@material-ui/core/utils';

export const styles = theme => ({
  /* Styles applied to the `Button` component. */
  button: {
    margin: 8,
    color: theme.palette.text.secondary,
    backgroundColor: theme.palette.common.white,
    '&:hover': {
      backgroundColor: emphasize(theme.palette.common.white, 0.15),
    },
    transition: `${theme.transitions.create('transform', {
      duration: theme.transitions.duration.shorter,
    })}, opacity 0.8s`,
    opacity: 1,
  },
  /* Styles applied to the `Button` component if `open={false}`. */
  buttonClosed: {
    opacity: 0,
    transform: 'scale(0)',
  },
});

function SpeedDialAction(props) {
  const {
    ButtonProps,
    classes,
    className,
    delay,
    icon,
    id,
    innerRef,
    onClick,
    onKeyDown,
    open,
    tooltipTitle,
    TooltipClasses,
    tooltipPlacement,
    tooltipOpen: tooltipOpenProp,
    ...other
  } = props;
  const timeout = React.useRef();
  const [tooltipOpenState, setTooltipOpenState] = React.useState(tooltipOpenProp);
  const [prevOpen, setPrevOpen] = React.useState();

  if (!open && tooltipOpenState) {
    setTooltipOpenState(false);
  }

  const handleTooltipClose = () => {
    if (!tooltipOpenProp) {
      setTooltipOpenState(false)
    }
  };

  const handleTooltipOpen = () => {
    if (!tooltipOpenProp) {
      setTooltipOpenState(true);
    }
  };

  React.useEffect(() => {
    if (tooltipOpenProp && prevOpen !== open){
      if (!tooltipOpenState) {
        timeout.current = setTimeout(() => setTooltipOpenState(true), delay + 100);
      } 
    }
    setPrevOpen(open);
  }, [delay, open, prevOpen, tooltipOpenProp, tooltipOpenState]);

  React.useEffect(() => {
    return () => {
      clearTimeout(timeout.current);
    }
  }, []);

  let clickProp = {onClick};
  if (typeof document !== 'undefined' && 'ontouchstart' in document.documentElement) {
    let startTime;
    clickProp = {
      onTouchStart: () => {
        startTime = new Date();
      },
      onTouchEnd: event => {
        // only perform action if the touch is a tap, i.e. not long press
        if (new Date() - startTime < 500) {
          onClick(event);
        }
      },
    };
  }

  return (
    <Tooltip
      id={id}
      title={tooltipTitle}
      placement={tooltipPlacement}
      onClose={handleTooltipClose}
      onOpen={handleTooltipOpen}
      open={open && tooltipOpenState}
      classes={TooltipClasses}
      {...other}
    >
      <Fab
        size="small"
        className={clsx(className, classes.button, !open && classes.buttonClosed)}
        style={{transitionDelay: `${delay}ms`}}
        tabIndex={-1}
        role="menuitem"
        onKeyDown={onKeyDown}
        {...ButtonProps}
        {...clickProp}
      >
        {icon}
      </Fab>
    </Tooltip>
  );
}

SpeedDialAction.propTypes = {
  /**
   * Properties applied to the [`Button`](/api/button/) component.
   */
  ButtonProps: PropTypes.object,
  /**
   * Override or extend the styles applied to the component.
   * See [CSS API](#css) below for more details.
   */
  classes: PropTypes.object.isRequired,
  /**
   * @ignore
   */
  className: PropTypes.string,
  /**
   * Adds a transition delay, to allow a series of SpeedDialActions to be animated.
   */
  delay: PropTypes.number,
  /**
   * The Icon to display in the SpeedDial Floating Action Button.
   */
  icon: PropTypes.node.isRequired,
  /**
   * @ignore
   */
  id: PropTypes.string,
  /**
   * @ignore
   * from `withForwardRef`
   */
  innerRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  /**
   * @ignore
   */
  onClick: PropTypes.func,
  /**
   * @ignore
   */
  onKeyDown: PropTypes.func,
  /**
   * @ignore
   */
  open: PropTypes.bool,
  /**
   * Classes applied to the [`Tooltip`](/api/tooltip/) element.
   */
  TooltipClasses: PropTypes.object,
  /**
   * Make the tooltip always visible when the SpeedDial is open.
   */
  tooltipOpen: PropTypes.bool,
  /**
   * Placement of the tooltip.
   */
  tooltipPlacement: PropTypes.oneOf([
    'bottom-end',
    'bottom-start',
    'bottom',
    'left-end',
    'left-start',
    'left',
    'right-end',
    'right-start',
    'right',
    'top-end',
    'top-start',
    'top',
  ]),
  /**
   * Label to display in the tooltip.
   */
  tooltipTitle: PropTypes.node.isRequired,
};

SpeedDialAction.defaultProps = {
  delay: 0,
  open: false,
  tooltipPlacement: 'left',
  tooltipOpen: false,
};

export default withStyles(styles, { name: 'MuiSpeedDialAction' })(
  withForwardedRef(SpeedDialAction),
);
