import { StackPanel } from "./stackPanel";
import { Observable, Nullable, Observer } from "babylonjs";
import { Button } from "./button";
import { Container } from "./container";
import { TextBlock } from "./textBlock";
import { InputText } from "./inputText";


/**
 * Class used to store key control properties
 */
export class KeyPropertySet {
    /** Width */
    width?: string;
    /** Height */
    height?: string;
    /** Left padding */
    paddingLeft?: string;
    /** Right padding */
    paddingRight?: string;
    /** Top padding */
    paddingTop?: string;
    /** Bottom padding */
    paddingBottom?: string;
    /** Foreground color */
    color?: string;
    /** Background color */
    background?: string;
}

/**
 * Class used to create virtual keyboard
 */
export class VirtualKeyboard extends StackPanel {
    /** Observable raised when a key is pressed */
    public onKeyPressObservable = new Observable<string>();

    /** Gets or sets default key button width */
    public defaultButtonWidth = "40px";
    /** Gets or sets default key button height */
    public defaultButtonHeight = "40px";

    /** Gets or sets default key button left padding */
    public defaultButtonPaddingLeft = "2px";
    /** Gets or sets default key button right padding */
    public defaultButtonPaddingRight = "2px";
    /** Gets or sets default key button top padding */
    public defaultButtonPaddingTop = "2px";
    /** Gets or sets default key button bottom padding */
    public defaultButtonPaddingBottom = "2px";

    /** Gets or sets default key button foreground color */
    public defaultButtonColor = "#DDD";
    /** Gets or sets default key button background color */
    public defaultButtonBackground = "#070707";

    /** Gets or sets shift button foreground color */
    public shiftButtonColor = "#7799FF";
    /** Gets or sets shift button thickness*/
    public selectedShiftThickness = 1;

    /** Gets shift key state */
    public shiftState = 0;

    protected _getTypeName(): string {
        return "VirtualKeyboard";
    }

    private _createKey(key: string, propertySet: Nullable<KeyPropertySet>) {
        var button = Button.CreateSimpleButton(key, key);

        button.width = propertySet && propertySet.width ? propertySet.width : this.defaultButtonWidth;
        button.height = propertySet && propertySet.height ? propertySet.height : this.defaultButtonHeight;
        button.color = propertySet && propertySet.color ? propertySet.color : this.defaultButtonColor;
        button.background = propertySet && propertySet.background ? propertySet.background : this.defaultButtonBackground;
        button.paddingLeft = propertySet && propertySet.paddingLeft ? propertySet.paddingLeft : this.defaultButtonPaddingLeft;
        button.paddingRight = propertySet && propertySet.paddingRight ? propertySet.paddingRight : this.defaultButtonPaddingRight;
        button.paddingTop = propertySet && propertySet.paddingTop ? propertySet.paddingTop : this.defaultButtonPaddingTop;
        button.paddingBottom = propertySet && propertySet.paddingBottom ? propertySet.paddingBottom : this.defaultButtonPaddingBottom;

        button.thickness = 0;
        button.isFocusInvisible = true;

        button.shadowColor = this.shadowColor;
        button.shadowBlur = this.shadowBlur;
        button.shadowOffsetX = this.shadowOffsetX;
        button.shadowOffsetY = this.shadowOffsetY;

        button.onPointerUpObservable.add(() => {
            this.onKeyPressObservable.notifyObservers(key);
        });

        return button;
    }

    /**
     * Adds a new row of keys
     * @param keys defines the list of keys to add
     * @param propertySets defines the associated property sets
     */
    public addKeysRow(keys: Array<string>, propertySets?: Array<KeyPropertySet>): void {
        let panel = new StackPanel();
        panel.isVertical = false;
        panel.isFocusInvisible = true;

        for (var i = 0; i < keys.length; i++) {
            let properties = null;

            if (propertySets && propertySets.length === keys.length) {
                properties = propertySets[i];
            }

            panel.addControl(this._createKey(keys[i], properties));
        }

        this.addControl(panel);
    }

    /**
     * Set the shift key to a specific state
     * @param shiftState defines the new shift state
     */
    public applyShiftState(shiftState: number): void {
        if (!this.children) {
            return;
        }

        for (var i = 0; i < this.children.length; i++) {
            let row = this.children[i];
            if (!row || !(<Container>row).children) {
                continue;
            }

            let rowContainer = <Container>row;
            for (var j = 0; j < rowContainer.children.length; j++) {
                let button = rowContainer.children[j] as Button;

                if (!button || !button.children[0]) {
                    continue;
                }

                let button_tblock = button.children[0] as TextBlock;

                if (button_tblock.text === "\u21E7") {
                    button.color = (shiftState ? this.shiftButtonColor : this.defaultButtonColor);
                    button.thickness = (shiftState > 1 ? this.selectedShiftThickness : 0);
                }

                button_tblock.text = (shiftState > 0 ? button_tblock.text.toUpperCase() : button_tblock.text.toLowerCase());
            }
        }
    }

    private _connectedInputText: Nullable<InputText>;
    private _onFocusObserver: Nullable<Observer<InputText>>;
    private _onBlurObserver: Nullable<Observer<InputText>>;
    private _onKeyPressObserver: Nullable<Observer<string>>;

    /** Gets the input text control attached with the keyboard */
    public get connectedInputText(): Nullable<InputText> {
        return this._connectedInputText;
    }

    /**
     * Connects the keyboard with an input text control
     * @param input defines the target control
     */
    public connect(input: InputText): void {
        this.isVisible = false;
        this._connectedInputText = input;

        // Events hooking
        this._onFocusObserver = input.onFocusObservable.add(() => {
            this.isVisible = true;
        });

        this._onBlurObserver = input.onBlurObservable.add(() => {
            this.isVisible = false;
        });

        this._onKeyPressObserver = this.onKeyPressObservable.add((key) => {
            if (!this._connectedInputText) {
                return;
            }
            switch (key) {
                case "\u21E7":
                    this.shiftState++;
                    if (this.shiftState > 2) {
                        this.shiftState = 0;
                    }
                    this.applyShiftState(this.shiftState);
                    return;
                case "\u2190":
                    this._connectedInputText.processKey(8);
                    return;
                case "\u21B5":
                    this._connectedInputText.processKey(13);
                    return;
            }
            this._connectedInputText.processKey(-1, (this.shiftState ? key.toUpperCase() : key));

            if (this.shiftState === 1) {
                this.shiftState = 0;
                this.applyShiftState(this.shiftState);
            }
        });
    }

    /**
     * Disconnects the keyboard from an input text control
     */
    public disconnect(): void {
        if (!this._connectedInputText) {
            return;
        }

        this._connectedInputText.onFocusObservable.remove(this._onFocusObserver);
        this._connectedInputText.onBlurObservable.remove(this._onBlurObserver);
        this.onKeyPressObservable.remove(this._onKeyPressObserver);

        this._connectedInputText = null;
    }

    // Statics

    /**
     * Creates a new keyboard using a default layout
     * @returns a new VirtualKeyboard
     */
    public static CreateDefaultLayout(): VirtualKeyboard {
        let returnValue = new VirtualKeyboard();

        returnValue.addKeysRow(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "\u2190"]);
        returnValue.addKeysRow(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]);
        returnValue.addKeysRow(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "\u21B5"]);
        returnValue.addKeysRow(["\u21E7", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]);
        returnValue.addKeysRow([" "], [{ width: "200px" }]);

        return returnValue;
    }
}
