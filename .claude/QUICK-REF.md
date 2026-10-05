# TranLe Tasks — Quick Command Reference

```text
/tranle-context   Đọc context/architecture
/tranle-plan      Lập kế hoạch, chưa code
/tranle-implement  Thực hiện kế hoạch
/tranle-debug     Debug theo root cause
/tranle-review    Review thay đổi
/tranle-verify    Test/build/verify
/tranle-rbac      Role/permission/access
/tranle-security  Security audit
/tranle-release   Kiểm tra trước release
```

### Workflow khuyến nghị
```text
Task lớn:
/tranle-context → /tranle-plan → /tranle-implement → /tranle-review → /tranle-verify

Bug:
/tranle-debug → /tranle-verify

Quyền:
/tranle-rbac → /tranle-security → /tranle-verify

Release:
/tranle-review → /tranle-security → /tranle-verify → /tranle-release
```
