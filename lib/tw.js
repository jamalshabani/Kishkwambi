import tw from 'twrnc';

// Utility function to create className-like syntax with twrnc
export const cn = (...classes) => {
  return tw`${classes.filter(Boolean).join(' ')}`;
};

// Alternative approach: Create a styled component factory
export const styled = (Component) => {
  return ({ className, ...props }) => {
    const styles = className ? tw`${className}` : {};
    return <Component style={styles} {...props} />;
  };
};

export default tw;
