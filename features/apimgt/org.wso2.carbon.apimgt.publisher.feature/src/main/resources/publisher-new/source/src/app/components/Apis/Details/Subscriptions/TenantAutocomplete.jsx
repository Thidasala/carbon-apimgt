/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import deburr from 'lodash/deburr';
import Downshift from 'downshift';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import MenuItem from '@material-ui/core/MenuItem';
import Chip from '@material-ui/core/Chip';
import API from 'AppData/api';
import CONSTS from 'AppData/Constants';
import APIContext  from 'AppComponents/Apis/Details/components/ApiContext';

const useStyles = makeStyles(theme => ({
  root: {
      flexGrow: 1,
      height: 250,
  },
  container: {
      flexGrow: 1,
      position: 'relative',
  },
  paper: {
      position: 'absolute',
      zIndex: 1,
      marginTop: theme.spacing(1),
      left: 0,
      right: 0,
  },
  chip: {
      margin: theme.spacing(0.5, 0.25),
  },
  inputRoot: {
      flexWrap: 'wrap',
  },
  inputInput: {
      width: 'auto',
      flexGrow: 1,
  },
  divider: {
      height: theme.spacing(2),
  },
}));

function renderInput(inputProps) {
    const {
 InputProps, classes, ref, ...other 
} = inputProps;

    return (
      <TextField
          InputProps={{
                inputRef: ref,
                classes: {
                    root: classes.inputRoot,
                    input: classes.inputInput,
                },
                ...InputProps,
            }}
          {...other}
        />
    );
}

renderInput.propTypes = {
    /**
   * Override or extend the styles applied to the component.
   */
    classes: PropTypes.object.isRequired,
    InputProps: PropTypes.object,
};

function renderSuggestion(suggestionProps) {
    const {
 suggestion, index, itemProps, highlightedIndex, selectedItem 
} = suggestionProps;
    const isHighlighted = highlightedIndex === index;
    const isSelected = (selectedItem || '').indexOf(suggestion) > -1;

    return (
        <MenuItem
            {...itemProps}
            key={suggestion}
            selected={isHighlighted}
            component='div'
            style={{
                fontWeight: isSelected ? 500 : 400,
            }}
        >
        {suggestion}
        </MenuItem>
    );
}

renderSuggestion.propTypes = {
    highlightedIndex: PropTypes.oneOfType([PropTypes.oneOf([null]), PropTypes.number]).isRequired,
    index: PropTypes.number.isRequired,
    itemProps: PropTypes.object.isRequired,
    selectedItem: PropTypes.string.isRequired,
    suggestion: PropTypes.string.isRequired,
};

function getSuggestions(value, suggestions, { showEmpty = false } = {}) {
  const inputValue = deburr(value.trim()).toLowerCase();
  const inputLength = inputValue.length;
  let count = 0;

  return inputLength === 0 && !showEmpty
    ? []
    : suggestions.filter(suggestion => {
        const keep =
          count < 5 && suggestion.slice(0, inputLength).toLowerCase() === inputValue;
        if (keep) {
          count += 1;
        }
        return keep;
      });
}

function DownshiftMultiple(props) {
    let {setTenantList} = props;
    const { classes, suggestions } = props;
    const [inputValue, setInputValue] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState([]);


    function handleKeyDown(event) {
        if (selectedItem.length && !inputValue.length && event.key === 'Backspace') {
            setSelectedItem(selectedItem.slice(0, selectedItem.length - 1));
        }
    }

    function handleInputChange(event) {
        setInputValue(event.target.value);
    }

    function handleChange(item) {
        let newSelectedItem = [...selectedItem];
        if (newSelectedItem.indexOf(item) === -1) {
            newSelectedItem = [...newSelectedItem, item];
        }
        setInputValue('');
        setSelectedItem(newSelectedItem);

        setTenantList(newSelectedItem);
        
    }

    const handleDelete = item => () => {
        const newSelectedItem = [...selectedItem];
        newSelectedItem.splice(newSelectedItem.indexOf(item), 1);
        setSelectedItem(newSelectedItem);
    };


    return (
        <Downshift
            id='downshift-multiple'
            inputValue={inputValue}
            onChange={handleChange}
            selectedItem={selectedItem}
        >
            {({
                getInputProps,
                getItemProps,
                getLabelProps,
                isOpen,
                inputValue: inputValue2,
                selectedItem: selectedItem2,
                highlightedIndex,
            }) => {
                const {
                    onBlur, onChange, onFocus, ...inputProps 
                } = getInputProps({
                    onKeyDown: handleKeyDown,
                    placeholder: 'Select multiple tenants',
                });

                return (
                    <div className={classes.container}>
                        {renderInput({
                            fullWidth: true,
                            classes,
                            label: 'Tenants',
                            InputLabelProps: getLabelProps(),
                            InputProps: {
                                startAdornment: selectedItem.map(item => (
                                    <Chip
                                        key={item}
                                        tabIndex={-1}
                                        label={item}
                                        className={classes.chip}
                                        onDelete={handleDelete(item)}
                                    />
                                )),
                                onBlur,
                                onChange: (event) => {
                                    handleInputChange(event);
                                    onChange(event);
                                },
                                onFocus,
                            },
                            inputProps,
                        })}

                        {isOpen ? (
                            <Paper className={classes.paper} square>
                                {getSuggestions(inputValue2, suggestions).map((suggestion, index) =>
                                    renderSuggestion({
                                        suggestion,
                                        index,
                                        itemProps: getItemProps({ item: suggestion }),
                                        highlightedIndex,
                                        selectedItem: selectedItem2,
                                    }),)}
                            </Paper>
                        ) : null}
                    </div>
                );
            }}
        </Downshift>
    );
}

DownshiftMultiple.propTypes = {
    classes: PropTypes.object.isRequired,
};

export default function IntegrationDownshift(props) {
  
    const classes = useStyles();
    let [suggestions, setsuggestions] = useState({});
    let {setTenantList} = props

    const restApi = new API();

    useEffect(() => {
      restApi.getTenantsByState(CONSTS.TENANT_STATE_ACTIVE)
      .then((result) => {
          const tenants = result.body.list;
          suggestions = tenants.map((tenant) => { return tenant.domain; });
          console.log(suggestions)
          setsuggestions(suggestions);
      });
    }, [])

    return (
        <div className={classes.root}>
            <div className={classes.divider} />
            <DownshiftMultiple classes={classes}  suggestions={suggestions} setTenantList={setTenantList} />
            <div className={classes.divider} />
        </div>
    );
}
