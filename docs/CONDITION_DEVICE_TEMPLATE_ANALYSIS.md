# Condition + Device Template Integration Analysis

## Current System vs. Desired System

### What You Want to Achieve

```
Event Trigger Flow:
1. Condition has:
   - device_group_id (references device_groups)
   - device_action_body (template: {"device":"{device_id}","model":"{model_id}","cmd":{"name":"brightness","value":"{brightness}"}})
   - static_params: {"device":"{device_id}","model":"{model_id}","cmd":{"name":"brightness"}} (constant values)
   - flexible_param: {"brightness"} (marker for which field gets event value)
   
2. When event triggers:
   - Extract flexible parameter value from event (e.g., brightness=128)
   - Inject into template at marked location
   - Send complete request body to device

3. Result:
   Final request: {"device":"dev_xyz","model":"model_123","cmd":{"name":"brightness","value":128}}
```

---

## Current System Analysis

### ✅ What Already Exists (Good News!)

1. **Device Action Body Template System**
   ```go
   DeviceActionBody interface{}             // Request body template
   DeviceActionParamName string              // Field to replace (e.g., "value")
   DeviceActionParamEvaluator ConditionLogicStructure // How to compute value
   ```
   - Status: **PARTIALLY IMPLEMENTED** in Condition model
   - Location: `internal/models/condition.go` lines 37-40
   - API: Already accepts these fields in `CreateConditionRequest`

2. **Flexible Parameter Evaluation**
   ```go
   DeviceActionParamEvaluator ConditionLogicStructure {
       Operator: "PARAM"              // Extract from event
       Variables: ["message"]         // Event field to extract
   }
   ```
   - Status: **INFRASTRUCTURE EXISTS** (condition logic evaluator)
   - Can extract any field from event JSON
   - Supports transformation operators (REGEX_EXTRACT, COLOR_PICKUP, etc.)

3. **Device Group Reference**
   - Condition already has `DeviceGroupID`
   - Device groups exist and can contain multiple devices

### ⚠️ What's Missing or Incomplete

1. **Template Storage Enhancement** (Minor)
   - ✅ Condition can store `device_action_body` (template)
   - ✅ Condition can store `device_action_param_name` (flexible field)
   - ✅ Condition can store `device_action_param_evaluator` (how to extract)
   - ⚠️ **Gap**: No way to explicitly mark which fields are static vs flexible
     - Currently only ONE field (`device_action_param_name`) is flexible
     - If you need multiple flexible fields, need enhancement
   - ⚠️ **Gap**: No reference to `device_brand_templates`
     - Should condition store which template it's using?

2. **Executor Implementation** (Critical)
   - ❌ `condition_executor.go` currently has a TODO stub
   - ❌ Does NOT implement device group iteration
   - ❌ Does NOT inject flexible parameters into template
   - Status: **NOT IMPLEMENTED**
   - Lines 42-75 show the problem:
     ```go
     slog.Warn("condition_executor: device group execution not yet implemented")
     return fmt.Errorf("device group execution not yet implemented")
     ```

3. **Parameter Injection Logic** (Critical)
   - ❌ No code that:
     - Takes device_action_body (template)
     - Evaluates device_action_param_evaluator against event
     - Injects result into device_action_param_name location
     - Builds final request JSON

4. **Event to Template Binding** (Missing)
   - Condition stores flexible parameter EVALUATOR
   - But condition_executor.go doesn't call it
   - Need: evaluation of `DeviceActionParamEvaluator` against event

---

## Database Schema Assessment

### Condition Table (Current)
```sql
CREATE TABLE conditions (
    id TEXT PRIMARY KEY,
    watch_id TEXT NOT NULL,
    name VARCHAR(255),
    event_type VARCHAR(50),
    filter VARCHAR(255),
    condition_logic JSONB,
    is_enabled BOOLEAN,
    device_group_id TEXT,
    device_action VARCHAR(50),
    device_action_params JSONB,         -- Legacy
    
    -- NEW FIELDS (Already exist!):
    device_action_body JSONB,            -- Template
    device_action_param_name VARCHAR(255), -- Flexible field name
    device_action_param_evaluator JSONB,  -- How to extract value
    
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Assessment**: ✅ Schema can already store your template system!

---

## What Needs to Be Updated

### Priority 1: Executor Implementation (CRITICAL)
**File**: `internal/device/condition_executor.go`

```go
// Current: Stub that returns error
// Needed: Full implementation

func (e *ConditionActionExecutor) Execute(ctx context.Context, cond *models.Condition, event *models.LiveEvent, params []string) error {
    // 1. Load device group
    // 2. Get all devices in group
    // 3. For each device:
    //    a. Evaluate device_action_param_evaluator against event
    //    b. Inject result into device_action_body at device_action_param_name
    //    c. Execute via template_executor with final body
    // 4. Handle device group execution strategy (PARALLEL, SEQUENTIAL, AFFINITY)
}
```

### Priority 2: Parameter Injection Logic
**New Function Needed**: `internal/device/template_renderer.go` (or extend template_executor.go)

```go
// Inject flexible parameter value into template
func InjectParameterIntoTemplate(template map[string]interface{}, paramName string, value interface{}) map[string]interface{} {
    // Deep clone template
    // Set nested field at paramName path (supports dot notation like "cmd.value")
    // Return modified copy
}
```

### Priority 3: Evaluator Integration
**File**: `internal/device/condition_executor.go`

```go
// Use existing condition logic evaluator to compute flexible param value
evaluatorResult, err := evaluateConditionLogic(cond.DeviceActionParamEvaluator, event)
```

### Priority 4: Optional - Add Template Reference (Enhancement)
**File**: `internal/models/condition.go`

```go
type Condition struct {
    // ... existing fields ...
    
    // NEW: Optional reference to template
    TemplateID *int64 `json:"template_id,omitempty"`  // References device_brand_templates(id)
    
    // When condition creates device_action_body from template:
    // - Clone from device_brand_templates.body_template
    // - Customize static values
    // - Mark flexible fields
}
```

This allows:
- Reusing templates across conditions
- Template versioning tracking
- Audit trail of which template was used

---

## Example: Complete Flow

### Step 1: Create Condition with Template
```bash
POST /conditions
{
  "watch_id": "watch_123",
  "name": "Brightness on Super Chat",
  "event_type": "superchat",
  "device_group_id": "group_lights",
  
  "device_action_body": {
    "device": "dev_xyz",
    "model": "model_123",
    "cmd": {
      "name": "brightness",
      "value": "{brightness}"
    }
  },
  "device_action_param_name": "cmd.value",  // Dot notation for nested field
  "device_action_param_evaluator": {
    "operator": "PARAM",
    "variables": ["amount"]  // Extract superchat amount
  }
}
```

### Step 2: Event Triggers
```json
Event: {"type": "superchat", "amount": 50, "username": "john"}
```

### Step 3: Executor Processes
```
1. Load device_group_lights (has 3 devices)
2. Evaluate param_evaluator: Extract event.amount = 50
3. Inject into template: device_action_body.cmd.value = 50
4. For each device in group:
   - Execute device command with final body:
     {
       "device": "dev_xyz",
       "model": "model_123",
       "cmd": {
         "name": "brightness",
         "value": 50
       }
     }
```

---

## Implementation Roadmap

### Phase 1: Core Execution (1-2 days)
- [ ] Implement `condition_executor.Execute()` 
- [ ] Load device group and iterate devices
- [ ] Parameter injection logic
- [ ] Call template_executor for each device

### Phase 2: Evaluator Integration (1 day)
- [ ] Connect DeviceActionParamEvaluator evaluation
- [ ] Handle transformation operators (REGEX_EXTRACT, etc.)
- [ ] Type coercion for parameter values

### Phase 3: Testing (1 day)
- [ ] Unit tests for parameter injection
- [ ] End-to-end flow test
- [ ] Device group execution strategy tests

### Phase 4: Optional Enhancements (Future)
- [ ] Add template_id foreign key to conditions
- [ ] Support multiple flexible parameters (instead of just one)
- [ ] Parameter validation against template constraints
- [ ] UI field hints from template

---

## Key Design Decisions Made for You

### ✅ Already Solved
1. **Single Flexible Parameter**: One field per condition is flexible (simplicity)
2. **Other Fields Are Static**: Everything else in device_action_body is static
3. **Deep Nesting Support**: Use dot notation for nested JSON paths ("cmd.value")
4. **Event Extraction**: Use existing ConditionLogicStructure + evaluator

### ⚠️ Still Needs Clarification
1. **Multiple Flexible Parameters**: Do you need more than one flexible field per condition?
   - If yes: Need to change from `device_action_param_name` to array
   
2. **Template Reuse**: Should conditions reference device_brand_templates by ID?
   - Pros: Audit trail, version control, reusability
   - Cons: Extra complexity, FK constraint

3. **Static Parameter Validation**: Should static values be validated against template constraints?
   - E.g., if template says brightness is 0-255, validate value at condition create time?

---

## Summary: Can Current System Work As You Described?

### Answer: **80% YES, needs executor implementation**

**What Works:**
- ✅ Condition storage (all fields exist)
- ✅ Device group reference
- ✅ Static parameter support
- ✅ Flexible parameter evaluation infrastructure
- ✅ Event extraction operators

**What's Missing:**
- ❌ Executor code to actually execute the flow
- ❌ Parameter injection into template
- ❌ Device group iteration in condition trigger

**Effort to Complete:** ~2-3 days for core implementation + testing
