# CTC Task — Quick Command Reference

```text
/ctc-context   Đọc context/architecture
/ctc-plan      Lập kế hoạch, chưa code
/ctc-implement  Thực hiện kế hoạch
/ctc-debug     Debug theo root cause
/ctc-review    Review thay đổi
/ctc-verify    Test/build/verify
/ctc-rbac      Role/permission/access
/ctc-security  Security audit
/ctc-release   Kiểm tra trước release
```

### Workflow khuyến nghị
```text
Task lớn:
/ctc-context → /ctc-plan → /ctc-implement → /ctc-review → /ctc-verify

Bug:
/ctc-debug → /ctc-verify

Quyền:
/ctc-rbac → /ctc-security → /ctc-verify

Release:
/ctc-review → /ctc-security → /ctc-verify → /ctc-release
```
